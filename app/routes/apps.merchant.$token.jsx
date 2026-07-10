import { authenticate } from "../shopify.server";
import { validateMerchantStorefrontSession } from "../models/saved-cart.server";

const MERCHANT_COOKIE_NAME = "shareCartProMerchantToken";

function fallbackLiquid(body, status = 200) {
  return new Response(`{% layout none %} ${body}`, {
    status,
    headers: { "Content-Type": "application/liquid" },
  });
}

function sessionError(message) {
  return `<main style="max-width: 640px; margin: 48px auto; padding: 0 20px; font-family: sans-serif;">
    <h1>Unable to open storefront</h1>
    <p>${message}</p>
  </main>`;
}

function getMaxAgeSeconds(expiresAt) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(Math.floor(remainingMs / 1000), 60);
}

export const loader = async ({ request, params }) => {
  let liquid = fallbackLiquid;
  let session;

  try {
    const context = await authenticate.public.appProxy(request);
    liquid = context.liquid || fallbackLiquid;
    session = context.session;
  } catch (error) {
    console.error("Saved cart merchant app proxy authentication failed", error);
    return fallbackLiquid(sessionError("The storefront merchant session could not be verified. Open a new session from the embedded app."), 200);
  }

  const url = new URL(request.url);
  const shop = session?.shop || url.searchParams.get("shop");

  if (!shop) {
    return liquid(sessionError("Missing shop context. Open a new session from the embedded app."), { layout: false });
  }

  let merchantSession;
  try {
    merchantSession = await validateMerchantStorefrontSession({
      shop,
      token: params.token,
    });
  } catch (error) {
    console.error("Saved cart merchant session lookup failed", { shop, token: params.token, error });
    return liquid(sessionError("The storefront merchant session could not be loaded. Check the app database migration and open a new session."), { layout: false });
  }

  if (!merchantSession) {
    return liquid(sessionError("This storefront merchant session has expired. Open a new session from the embedded app."), { layout: false });
  }

  const maxAgeSeconds = getMaxAgeSeconds(merchantSession.expiresAt);

  return liquid(`
    <main style="max-width: 640px; margin: 48px auto; padding: 0 20px; font-family: sans-serif;">
      <h1>Opening storefront</h1>
      <p>You can now generate saved cart links from the cart page.</p>
    </main>
    <script>
      document.cookie = ${JSON.stringify(MERCHANT_COOKIE_NAME)} + "=" + encodeURIComponent(${JSON.stringify(params.token)}) + "; max-age=${maxAgeSeconds}; path=/; SameSite=Lax; Secure";
      window.location.href = "/cart";
    </script>
  `, { layout: false });
};
