function copyWithSelection(text) {
  const textArea = document.createElement("textarea");
  const activeElement = document.activeElement;

  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } finally {
    textArea.remove();
    activeElement?.focus?.();
  }
}

export async function copyToClipboard(text) {
  // Clipboard API access is commonly blocked inside the Shopify Admin iframe.
  // The selection API still works there and must run during the click event.
  if (window.self !== window.top && copyWithSelection(text)) return;

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API is unavailable");
    }

    await navigator.clipboard.writeText(text);
  } catch (clipboardError) {
    if (copyWithSelection(text)) return;
    throw clipboardError;
  }
}
