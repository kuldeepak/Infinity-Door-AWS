(function () {
  var CART_PATH_PATTERN = /\/cart\/?$/;
  var BLOCK_SELECTOR = "[data-share-cart-pro-block]";
  var DEBUG = new URLSearchParams(window.location.search).get("sc_debug") === "1";
  var CHECKOUT_SELECTORS = [
    'button[name="checkout"]',
    'input[name="checkout"]',
    'button[id*="checkout" i]',
    'input[id*="checkout" i]',
    'button[class*="checkout" i]',
    'input[class*="checkout" i]',
    'a[href*="/checkout"]',
    '[data-testid*="checkout" i] button',
    'form[action*="/cart"] [name="checkout"]',
    'form[action*="/cart"] button[type="submit"]',
    'form[action*="/cart"] input[type="submit"]'
  ];
  var CHECKOUT_CONTAINER_SELECTORS = [
    '.cart__ctas',
    '.cart__checkout-button',
    '.cart__footer-buttons',
    '.cart-buttons',
    '.cart__submit-controls',
    '[class*="checkout" i]',
    'form[action*="/cart"]'
  ];
  var SUMMARY_SELECTORS = [
    '[data-cart-summary]',
    '[data-cart-totals]',
    '.cart-summary',
    '.cart__summary',
    '.cart__footer',
    '.cart-footer',
    '.cart__blocks',
    '.cart__ctas',
    '.totals',
    '#main-cart-footer',
    'cart-items + div'
  ];

  function querySelector(selector, root) {
    try {
      return (root || document).querySelector(selector);
    } catch (_error) {
      return null;
    }
  }

  function querySelectorAll(selector, root) {
    try {
      return (root || document).querySelectorAll(selector);
    } catch (_error) {
      return [];
    }
  }

  function getMerchantToken() {
    try {
      var match = document.cookie.match(/(?:^|; )shareCartProMerchantToken=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : "";
    } catch (_error) {
      return "";
    }
  }

  function canShowButton() {
    var config = window.ShareCartPro || {};
    return Boolean(config.canGenerate || getMerchantToken());
  }

  function hasCheckoutText(element) {
    var text = (element.textContent || element.value || "").replace(/\s+/g, " ").trim().toLowerCase();
    return text === "checkout" || text === "check out" || text.indexOf("checkout") !== -1 || text.indexOf("check out") !== -1;
  }

  function isVisible(element) {
    if (!element) return false;
    var rect = element.getBoundingClientRect();
    var styles = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && styles.display !== "none" && styles.visibility !== "hidden";
  }

  function findCheckoutButton() {
    for (var i = 0; i < CHECKOUT_SELECTORS.length; i += 1) {
      var selected = querySelector(CHECKOUT_SELECTORS[i]);
      if (selected && isVisible(selected)) return selected;
    }

    var candidates = querySelectorAll('button, input[type="submit"], a[href*="/checkout"]');
    for (var j = 0; j < candidates.length; j += 1) {
      if (isVisible(candidates[j]) && hasCheckoutText(candidates[j])) return candidates[j];
    }

    return null;
  }

  function findCheckoutContainer(checkoutButton) {
    if (!checkoutButton) return null;

    for (var i = 0; i < CHECKOUT_CONTAINER_SELECTORS.length; i += 1) {
      var container = checkoutButton.closest(CHECKOUT_CONTAINER_SELECTORS[i]);
      if (container && isVisible(container)) return container;
    }

    return checkoutButton;
  }

  function findFallbackTarget() {
    for (var i = 0; i < SUMMARY_SELECTORS.length; i += 1) {
      var target = querySelector(SUMMARY_SELECTORS[i]);
      if (target && isVisible(target)) return target;
    }

    return querySelector('form[action*="/cart"]') || querySelector("main");
  }

  function createButtonBlock() {
    var wrapper = document.createElement("div");
    wrapper.setAttribute("data-share-cart-pro-block", "true");
    wrapper.setAttribute("data-share-cart-pro-placement", "pending");
    wrapper.style.margin = "12px 0 0";
    wrapper.style.width = "100%";

    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "Generate Link";
    button.setAttribute("data-share-cart-pro-button", "true");
    button.style.width = "100%";
    button.style.minHeight = "44px";
    button.style.cursor = "pointer";

    var message = document.createElement("div");
    message.setAttribute("data-share-cart-pro-message", "true");
    message.setAttribute("role", "status");
    message.style.marginTop = "8px";
    message.style.fontSize = "14px";

    wrapper.appendChild(button);
    wrapper.appendChild(message);

    function setMessage(text, isError) {
      message.textContent = text;
      message.style.color = isError ? "#8a1f11" : "#0a7a35";
    }

    button.addEventListener("click", async function () {
      var config = window.ShareCartPro || {};
      button.disabled = true;
      button.textContent = "Generating...";
      setMessage("", false);

      try {
        var cartResponse = await fetch("/cart.js", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        if (!cartResponse.ok) throw new Error("Could not read the current cart.");
        var cart = await cartResponse.json();

        var endpoint = config.generateEndpoint || "/apps/saved-cart/generate/";
        if (DEBUG) endpoint += (endpoint.indexOf("?") === -1 ? "?" : "&") + "sc_debug=1";
        var saveResponse = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { 
            "Content-Type": "application/json", 
            Accept: "application/json" 
          },
          body: JSON.stringify({ 
            cart: cart, 
            merchantToken: getMerchantToken() 
          })
        });
        var responseText = await saveResponse.text();
        var result = {};
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (_error) {
          result = { error: responseText };
        }
        if (!saveResponse.ok) {
          var returnedHtml = /^\s*<!doctype html/i.test(responseText) || /^\s*<html/i.test(responseText);
          if (DEBUG) console.error("ShareCartPro generate failed", { status: saveResponse.status, result: result, responseText: responseText });
          if (returnedHtml) throw new Error("App proxy returned storefront HTML instead of the saved-cart API response. Check the Shopify app proxy configuration and deployment.");
          throw new Error(result.error || ("Could not generate the saved cart link. HTTP " + saveResponse.status));
        }

        var absoluteUrl = new URL(result.url, window.location.origin).href;
        await navigator.clipboard.writeText(absoluteUrl);
        setMessage("Saved cart link copied to clipboard.", false);
      } catch (error) {
        setMessage(error.message || "Could not generate the saved cart link.", true);
      } finally {
        button.disabled = false;
        button.textContent = "Generate Link";
      }
    });

    return wrapper;
  }

  function getButtonBlock() {
    return querySelector(BLOCK_SELECTOR) || createButtonBlock();
  }

  function placeBlockAfter(target, placement) {
    if (!target || !target.parentNode) return false;

    var block = getButtonBlock();
    if (block.previousElementSibling === target && block.getAttribute("data-share-cart-pro-placement") === placement) return true;

    target.insertAdjacentElement("afterend", block);
    block.setAttribute("data-share-cart-pro-placement", placement);
    return true;
  }

  function placeAfterCheckout() {
    var checkoutButton = findCheckoutButton();
    var checkoutContainer = findCheckoutContainer(checkoutButton);
    return placeBlockAfter(checkoutContainer, "checkout");
  }

  function placeFallback() {
    var target = findFallbackTarget();
    return placeBlockAfter(target, "fallback");
  }

  function mountButton(options) {
    var useFallback = options && options.useFallback;
    if (!CART_PATH_PATTERN.test(window.location.pathname)) return "done";
    if (!canShowButton()) return "wait";
    if (placeAfterCheckout()) return "checkout";
    if (useFallback && placeFallback()) return "fallback";
    return "wait";
  }

  function boot() {
    var startedAt = Date.now();
    var result = mountButton({ useFallback: false });
    if (result === "checkout") return;

    var observer = new MutationObserver(function () {
      var elapsed = Date.now() - startedAt;
      var shouldFallback = elapsed > 10000;
      var placement = mountButton({ useFallback: shouldFallback });

      if (placement === "checkout" || elapsed > 15000) {
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

