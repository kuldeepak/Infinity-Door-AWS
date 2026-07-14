import { useState } from "react";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { deleteSavedCart, getSavedCart, parseCartJson } from "../models/saved-cart.server";
import { DeleteSavedCartModal } from "../components/DeleteSavedCartModal";
import { SavedCartLineItems } from "../components/SavedCartLineItems";
import { SavedCartSummary } from "../components/SavedCartSummary";
import { copyToClipboard } from "../utils/copy-to-clipboard";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const cart = await getSavedCart(session.shop, params.token);
  if (!cart) throw new Response("Saved cart not found", { status: 404 });

  return {
    cart,
    cartJson: parseCartJson(cart.cartJson),
    cartUrl: `https://${session.shop}/apps/saved-cart/${cart.token}/`,
  };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "delete") {
    throw new Response("Unsupported action", { status: 400 });
  }

  await deleteSavedCart({ shop: session.shop, token: params.token });
  return redirect("/app/saved-carts?deleted=1");
};

export default function SavedCartDetail() {
  const { cart, cartJson, cartUrl } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const isDeleting = fetcher.state !== "idle";

  const copyUrl = async () => {
    try {
      await copyToClipboard(cartUrl);
      shopify.toast.show("Saved cart URL copied");
    } catch (error) {
      console.error("Could not copy saved cart URL", error);
      shopify.toast.show("Could not copy the saved cart URL", { isError: true });
    }
  };

  const deleteCart = () => {
    fetcher.submit({ intent: "delete" }, { method: "POST" });
  };

  return (
    <s-page heading={`Saved cart ${cart.token}`}>
      <s-button slot="primary-action" onClick={copyUrl}>Copy cart URL</s-button>
      <s-button slot="secondary-actions" href="/app/saved-carts">Back</s-button>
      <s-button slot="secondary-actions" tone="critical" onClick={() => setDeleteModalOpen(true)}>Delete</s-button>

      <s-section>
        <s-stack direction="inline" gap="base" alignItems="center">
          {/* <s-badge tone={cart.status === "Recovered" ? "success" : "info"}>{cart.status}</s-badge> */}
          <s-text>{cartUrl}</s-text>
        </s-stack>
      </s-section>

      <SavedCartLineItems items={cart.items} />
      <SavedCartSummary cart={cart} />

      <s-section slot="aside" heading="Customer">
        <s-stack direction="block" gap="base">
          <s-text>Name: {cart.customerName || "-"}</s-text>
          <s-text>Email: {cart.customerEmail || "-"}</s-text>
          <s-text>Region: {cart.region || "-"}</s-text>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Cart details">
        <s-stack direction="block" gap="base">
          <s-text>Note: {cartJson.note || "-"}</s-text>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(cartJson.attributes || {}, null, 2)}</pre>
        </s-stack>
      </s-section>

      <DeleteSavedCartModal
        cartToken={cart.token}
        isDeleting={isDeleting}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={deleteCart}
        open={deleteModalOpen}
      />
    </s-page>
  );
}
