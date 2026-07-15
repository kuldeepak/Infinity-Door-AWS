import { useLoaderData, useSearchParams } from "react-router";
import { OpenStorefrontAsMerchantButton } from "../components/OpenStorefrontAsMerchantButton";
import { SavedCartsFilters } from "../components/SavedCartsFilters";
import { SavedCartsTable } from "../components/SavedCartsTable";
import { listSavedCarts } from "../models/saved-cart.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const query = url.searchParams.get("q") || "";
  const data = await listSavedCarts({ shop: session.shop, query, page });

  return { ...data, query };
};

export default function SavedCartsIndex() {
  const { carts, count, page, totalPages, hasNext, hasPrevious, query } = useLoaderData();
  const [searchParams] = useSearchParams();

  const pageHref = (nextPage) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const queryString = params.toString();
    return queryString ? `/app/saved-carts?${queryString}` : "/app/saved-carts";
  };

  return (
    <s-page heading="RFQ List">
      <OpenStorefrontAsMerchantButton slot="primary-action" />

      <s-section>
        <SavedCartsFilters query={query} />
      </s-section>

      <SavedCartsTable carts={carts} />

      <s-section>
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-text>{count} saved carts</s-text>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-text>Page {page} of {totalPages}</s-text>
            <s-button href={hasPrevious ? pageHref(page - 1) : undefined} disabled={!hasPrevious}>Previous</s-button>
            <s-button href={hasNext ? pageHref(page + 1) : undefined} disabled={!hasNext}>Next</s-button>
          </s-stack>
        </s-stack>
      </s-section>
    </s-page>
  );
}
