import { useEffect, useState } from "react";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { deleteSavedCart, getSavedCart, parseCartJson, updateSavedCartCustomer } from "../models/saved-cart.server";
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

function formString(formData, key, maxLength) {
  return String(formData.get(key) || "").trim().slice(0, maxLength);
}

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteSavedCart({ shop: session.shop, token: params.token });
    return redirect("/app/saved-carts?deleted=1");
  }

  if (intent !== "update_customer") {
    throw new Response("Unsupported action", { status: 400 });
  }

  const customerName = formString(formData, "customerName", 255);
  const customerEmail = formString(formData, "customerEmail", 255);
  const customerPhone = formString(formData, "customerPhone", 50);
  const region = formString(formData, "region", 255);
  const errors = {};

  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    errors.customerEmail = "Enter a valid email address";
  }
  if (customerPhone && !/^[0-9+().\-\s]+$/.test(customerPhone)) {
    errors.customerPhone = "Use only numbers, spaces, +, -, parentheses, or periods";
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const result = await updateSavedCartCustomer({
    shop: session.shop,
    token: params.token,
    customerName: customerName || null,
    customerEmail: customerEmail || null,
    customerPhone: customerPhone || null,
    region: region || null,
  });
  if (!result.count) throw new Response("Saved cart not found", { status: 404 });

  return { ok: true };
};

export default function SavedCartDetail() {
  const { cart, cartJson, cartUrl } = useLoaderData();
  const deleteFetcher = useFetcher();
  const customerFetcher = useFetcher();
  const shopify = useAppBridge();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const isDeleting = deleteFetcher.state !== "idle";
  const isSavingCustomer = customerFetcher.state !== "idle";
  const customerErrors = customerFetcher.data?.errors || {};

  useEffect(() => {
    if (customerFetcher.data?.ok) shopify.toast.show("Customer details updated");
  }, [customerFetcher.data, shopify]);

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
    deleteFetcher.submit({ intent: "delete" }, { method: "POST" });
  };

  return (
    <s-page heading={`Saved cart ${cart.token}`}>
      <s-button slot="primary-action" onClick={copyUrl}>Copy cart URL</s-button>
      <s-button slot="secondary-actions" href="/app/saved-carts">Back</s-button>
      <s-button slot="secondary-actions" tone="critical" onClick={() => setDeleteModalOpen(true)}>Delete</s-button>

      <s-section>
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-text>{cartUrl}</s-text>
        </s-stack>
      </s-section>

      <SavedCartLineItems items={cart.items} />
      <SavedCartSummary cart={cart} />

      <s-section slot="aside" heading="Customer">
        <customerFetcher.Form method="post">
          <input type="hidden" name="intent" value="update_customer" />
          <s-stack direction="block" gap="base">
            <s-text-field label="Name" name="customerName" defaultValue={cart.customerName || ""} />
            <s-text-field label="Email" name="customerEmail" type="email" defaultValue={cart.customerEmail || ""} error={customerErrors.customerEmail} />
            <s-text-field label="Phone number" name="customerPhone" type="tel" defaultValue={cart.customerPhone || ""} error={customerErrors.customerPhone} />
            <s-text-field label="Region" name="region" defaultValue={cart.region || ""} />
            <s-button type="submit" variant="primary" loading={isSavingCustomer}>Update customer details</s-button>
          </s-stack>
        </customerFetcher.Form>
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