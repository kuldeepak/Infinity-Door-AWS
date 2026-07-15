import { boundary } from "@shopify/shopify-app-react-router/server";
import { OpenStorefrontAsMerchantButton } from "../components/OpenStorefrontAsMerchantButton";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="RFQ">
      <OpenStorefrontAsMerchantButton slot="primary-action" />

      <s-section heading="Saved cart links">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Create cart recovery links from the storefront cart page, then track saved carts and recovered orders here.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button href="/app/saved-carts">View saved carts</s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Storefront authorization">
        <s-unordered-list>
          <s-list-item>Customers tagged cart-link-merchant see the Generate Link button on /cart.</s-list-item>
          <s-list-item>Staff can use Open storefront as merchant to create a 15-minute storefront session.</s-list-item>
          <s-list-item>Normal customers do not see the storefront button.</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
