/* eslint-disable react/prop-types */
import { moneyFromCents } from "../utils/money";

export function SavedCartLineItems({ items, currency = "USD" }) {
  return (
    <s-section heading="Products">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Product</th>
            <th style={thStyle}>SKU</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Quantity</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const properties = parseProperties(item.propertiesJson);
            return (
              <tr key={item.id}>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }} />}
                    <div>
                      <strong>{item.title}</strong>
                      {item.variantTitle && <div>{item.variantTitle}</div>}
                      {Object.keys(properties).length > 0 && (
                        <div style={{ marginTop: 6, color: "#616161" }}>
                          {Object.entries(properties).map(([key, value]) => <div key={key}>{key}: {formatPropertyValue(value)}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>{item.sku || "-"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{item.quantity}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{moneyFromCents(item.price, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </s-section>
  );
}

function parseProperties(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value || "{}") : value || {};
    return parsed.properties && typeof parsed.properties === "object" && !Array.isArray(parsed.properties)
      ? parsed.properties
      : parsed;
  } catch (_error) {
    return {};
  }
}

function formatPropertyValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const thStyle = { borderBottom: "1px solid #ddd", padding: "10px 8px", textAlign: "left", fontSize: "12px", fontWeight: 600 };
const tdStyle = { borderBottom: "1px solid #eee", padding: "12px 8px", verticalAlign: "top" };


