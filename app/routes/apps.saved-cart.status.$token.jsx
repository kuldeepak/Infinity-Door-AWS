import { authenticate } from "../shopify.server";
import { getSavedCart } from "../models/saved-cart.server";

function parseProperties(value) {
  try { return typeof value === "string" ? JSON.parse(value) : value || {}; }
  catch (_error) { return {}; }
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
}

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return json({ error: "App is not installed for this shop." }, { status: 401 });
  const savedCart = await getSavedCart(session.shop, params.token);
  if (!savedCart) return json({ error: "Saved cart not found." }, { status: 404 });
  return json({ token: savedCart.token, items: savedCart.items.map((item) => ({
    variantId: item.variantId, quantity: item.quantity, properties: parseProperties(item.propertiesJson),
  })) });
};