import { authenticate } from "../shopify.server";
import {
  createSavedCart,
  getAuthorizedCustomer,
  validateMerchantStorefrontSession,
} from "../models/saved-cart.server";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

export const action = async ({ request }) => {
  const url = new URL(request.url);
  const debug = url.searchParams.get("sc_debug") === "1";
  let context;

  try {
    context = await authenticate.public.appProxy(request);
  } catch (error) {
    console.error("Saved cart app proxy authentication failed", { error });
    return json(
      {
        error: "App proxy authentication failed. Restart Shopify dev preview and make sure the app proxy points to this app URL.",
        stage: "app_proxy_auth",
        details: debug ? { message: error.message, name: error.name } : undefined,
      },
      { status: 401 },
    );
  }

  const { admin, session } = context;
  if (!session) return json({ error: "App is not installed for this shop." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const cart = body.cart;
  const merchantToken = body.merchantToken;

  if (!cart?.items?.length) {
    return json({ error: "Add products to the cart before generating a link.", stage: "cart_payload" }, { status: 400 });
  }

  let customer;

  try {
    customer = await getAuthorizedCustomer({
      admin,
      customerId: url.searchParams.get("logged_in_customer_id"),
    });
  } catch (error) {
    return json(
      {
        error: `Could not verify the customer tag. Reauthorize the app so the read_customers scope is active, then try again. ${error.message || ""}`.trim(),
        stage: "customer_lookup",
        details: debug ? { message: error.message, name: error.name } : undefined,
      },
      { status: 403 },
    );
  }

  if (!customer && merchantToken) {
    try {
      const merchantSession = await validateMerchantStorefrontSession({
        shop: session.shop,
        token: merchantToken,
      });
      if (merchantSession) {
        customer = { name: "Store merchant", email: merchantSession.email, region: null };
      }
    } catch (error) {
      console.error("Saved cart merchant session lookup failed", { shop: session.shop, error });
      return json(
        { error: "Could not verify the merchant session. Open storefront as merchant again from the embedded app.", stage: "merchant_session", details: debug ? { message: error.message, name: error.name } : undefined },
        { status: 403 },
      );
    }
  }

  if (!customer) {
    return json({ error: "Only authorized merchant or staff users can generate saved cart links.", stage: "authorization" }, { status: 403 });
  }

  try {
    const savedCart = await createSavedCart({ shop: session.shop, cart, customer });
    const shareUrl = `/apps/saved-cart/${savedCart.token}/`;

    return json({ token: savedCart.token, url: shareUrl });
  } catch (error) {
    console.error("Saved cart create failed", { shop: session.shop, error });
    return json({
      error: `Could not save cart data. ${error.message || ""}`.trim(),
      stage: "create_saved_cart",
      details: debug ? { message: error.message, name: error.name, code: error.code, meta: error.meta } : undefined,
    }, { status: 500 });
  }
};

export const loader = async () => json({ error: "Method not allowed" }, { status: 405 });

