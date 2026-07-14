/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

export function OpenStorefrontAsMerchantButton({ slot }) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isOpening = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.storefrontUrl) {
      window.open(fetcher.data.storefrontUrl, "_blank", "noopener,noreferrer");
      shopify.toast.show("Storefront merchant session created");
    }
  }, [fetcher.data?.storefrontUrl, shopify]);

  const openStorefront = () => {
    fetcher.submit({}, { method: "POST", action: "/app/storefront-session" });
  };

  return (
    <s-button slot={slot} onClick={openStorefront} loading={isOpening}>
      Open RFQ for Client
    </s-button>
  );
}
