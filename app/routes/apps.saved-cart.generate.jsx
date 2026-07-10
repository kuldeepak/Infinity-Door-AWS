import fs from "node:fs";
import path from "node:path";
import { authenticate } from "../shopify.server";
import {
  createSavedCart,
  getAuthorizedCustomer,
  validateMerchantStorefrontSession,
} from "../models/saved-cart.server";

const DEBUG_LOG_PATH = path.join(process.cwd(), "saved-cart-generate-debug.log");

function logDebug(entry) {
  try {
    fs.appendFileSync(DEBUG_LOG_PATH, `${new Date().toISOString()} ${JSON.stringify(entry)}\n`);
  } catch (_error) {
    // best-effort logging only
  }
}


async function parseGenerateBody(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const cartText = formData.get("cart");
    return {
      cart: typeof cartText === "string" ? JSON.parse(cartText) : null,
      merchantToken: formData.get("merchantToken") || "",
    };
  }

  return request.json().catch(() => ({}));
}
function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

async function runGenerateAction({ request }) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("sc_debug") === "1";

  logDebug({
    stage: "request_received",
    method: request.method,
    url: request.url,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(request.headers),
  });

  let context;

  try {
    context = await authenticate.public.appProxy(request);
  } catch (error) {
    logDebug({ stage: "app_proxy_auth_failed", message: error?.message, name: error?.name, stack: error?.stack });
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
  logDebug({ stage: "app_proxy_auth_ok", shop: session?.shop || null });
  if (!session) return json({ error: "App is not installed for this shop." }, { status: 401 });

  const body = await parseGenerateBody(request).catch((error) => ({ parseError: error }));
  if (body.parseError) {
    return json({ error: "Could not parse cart payload.", stage: "cart_payload", details: debug ? { message: body.parseError.message } : undefined }, { status: 400 });
  }

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
}

export const action = async ({ request }) => {
  try {
    return await runGenerateAction({ request });
  } catch (error) {
    logDebug({ stage: "unhandled_exception", message: error?.message, name: error?.name, stack: error?.stack });
    console.error("Saved cart generate: unhandled exception", { error });
    return json(
      { error: "Unexpected server error while generating the saved cart link.", stage: "unhandled" },
      { status: 500 },
    );
  }
};

export const loader = async () => json({ ok: true, route: "apps.saved-cart.generate" });

