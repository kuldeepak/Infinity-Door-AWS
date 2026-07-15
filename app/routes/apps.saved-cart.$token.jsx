import { authenticate } from "../shopify.server";
import { getSavedCart, parseCartJson } from "../models/saved-cart.server";

function escapeScriptJson(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

export const loader = async ({ request, params }) => {
  const { liquid, session } = await authenticate.public.appProxy(request);
  if (!session) {
    return liquid("<main><h1>Saved cart unavailable</h1><p>The app is not connected to this store.</p></main>");
  }

  const savedCart = await getSavedCart(session.shop, params.token);
  if (!savedCart) {
    return liquid("<main><h1>Saved cart not found</h1><p>This saved cart link is invalid or has expired.</p></main>");
  }

  const cart = parseCartJson(savedCart.cartJson);
  const payload = {
    token: savedCart.token,
    items: (cart.items || []).map((item) => ({
      id: item.variant_id || item.id,
      quantity: item.quantity,
      properties: { ...(item.properties || {}), _saved_cart_token: savedCart.token },
    })),
    attributes: { ...(cart.attributes || {}), _saved_cart_token: savedCart.token },
    note: cart.note || "",
  };

  return liquid(`
    <main style="max-width: 720px; margin: 48px auto; padding: 0 20px; font-family: inherit;">
      <h1>Restoring saved cart</h1>
      <p id="share-cart-pro-status">Please wait while we rebuild your cart.</p>
    </main>
    <script type="application/json" id="share-cart-pro-restore-data">${escapeScriptJson(payload)}</script>
    <script>
      (async function restoreSavedCart() {
        const status = document.getElementById("share-cart-pro-status");
        const payload = JSON.parse(document.getElementById("share-cart-pro-restore-data").textContent);

        function showError(message) {
          status.textContent = "";
          console.error("ShareCartPro cart restoration failed:", message);
        }

        try {
          await fetch("/cart/clear.js", { method: "POST", headers: { "Accept": "application/json" } });
          const addResponse = await fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ items: payload.items }),
          });

          if (!addResponse.ok) {
            const detail = await addResponse.json().catch(() => ({}));
            throw new Error(detail.description || detail.message || "One or more products are unavailable.");
          }

          const updateResponse = await fetch("/cart/update.js", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ attributes: payload.attributes, note: payload.note }),
          });

          if (!updateResponse.ok) {
            throw new Error("The restored cart details could not be saved.");
          }

          window.location.href = "/cart";
        } catch (error) {
          showError(error.message || "One or more products are unavailable.");
        }
      })();
    </script>
  `);
};
