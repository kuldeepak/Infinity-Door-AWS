(function () {
  var CART_PATH_PATTERN = /\/cart\/?$/;
  var BLOCK_SELECTOR = "[data-share-cart-pro-block]";
  var CHECKOUT_SELECTORS = [
    'button#checkout.cart__checkout-button[name="checkout"]',
    'input[type="submit"][name="update"].cart__update',
    'input[name="update"].update_button.Cont_Shopping',
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
    'cart__ctas',
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

  async function copyToClipboard(text) {
    function copyWithSelection() {
      var textArea = document.createElement("textarea");
      var activeElement = document.activeElement;
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
        if (activeElement && activeElement.focus) activeElement.focus();
      }
    }

    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(text);
    } catch (clipboardError) {
      if (copyWithSelection()) return;
      throw clipboardError;
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

    if (checkoutButton.matches('input[name="update"].update_button')) {
      return checkoutButton;
    }

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
    button.classList.add("button");

    button.style.width = "auto"; 
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
      console.log("genrate button clicked");
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
        console.log("Fixing")
        var endpoint = (window.ShareCartPro || {}).generateEndpoint || "/apps/saved-cart/generate/";
        // if (DEBUG) endpoint += (endpoint.indexOf("?") === -1 ? "?" : "&") + "sc_debug=1";
        var payload = new URLSearchParams();
        payload.set("cart", JSON.stringify(cart));
        payload.set("merchantToken", getMerchantToken());
        payload.set("shop", (window.ShareCartPro || {}).shop || "");

        console.info("ShareCartPro proxy request", {
          endpoint: endpoint,
          itemCount: Array.isArray(cart.items) ? cart.items.length : 0,
          shop: (window.ShareCartPro || {}).shop || "",
          hasMerchantToken: Boolean(getMerchantToken())
        });


        var saveResponse = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            Accept: "application/json"
          },
          body: payload.toString()
        });
        var responseText = await saveResponse.text();

        var responseDetails = {
          status: saveResponse.status,
          statusText: saveResponse.statusText,
          url: saveResponse.url,
          redirected: saveResponse.redirected,
          responseType: saveResponse.type,
          contentType: saveResponse.headers.get("content-type"),
          requestId: saveResponse.headers.get("x-request-id") || saveResponse.headers.get("x-saved-cart-request-id"),
          bodyPreview: responseText.replace(/\s+/g, " ").slice(0, 500)
        };
        console.info("ShareCartPro proxy response", responseDetails);


        console.log("Fixes")
        var result = {};
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (_error) {
          result = { error: responseText };
        }
        if (!saveResponse.ok) {
          var returnedHtml = /^\s*<!doctype html/i.test(responseText) || /^\s*<html/i.test(responseText);
          console.error("ShareCartPro generate failed", responseDetails);
          if (returnedHtml) throw new Error("App proxy returned storefront HTML (HTTP " + saveResponse.status + "). Check the browser console for proxy diagnostics.");
          throw new Error(result.error || ("Could not generate the saved cart link. HTTP " + saveResponse.status));
        }

        var absoluteUrl = new URL(result.url, window.location.origin).href;
        await copyToClipboard(absoluteUrl);
        setMessage("Saved cart link copied to clipboard.", false);
      } catch (error) {
        console.error("ShareCartPro saved cart generation failed", error);
        setMessage("", false);
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

(function () {
  var ENABLE_RESTORED_CART_CHECKOUT = false;
  if (!ENABLE_RESTORED_CART_CHECKOUT) return;

  var TOKEN_PROPERTY = "_saved_cart_token";
  var validationTimer;
  var lastVisible;

  function comparableProperties(properties) {
    var result = {};
    Object.keys(properties || {}).sort().forEach(function (key) {
      if (key !== TOKEN_PROPERTY) result[key] = properties[key];
    });
    return JSON.stringify(result);
  }

  function isComplete(cart, expected) {
    return expected.items.length > 0 && expected.items.every(function (savedItem) {
      var present = (cart.items || []).reduce(function (quantity, cartItem) {
        var properties = cartItem.properties || {};
        var matches = String(cartItem.variant_id) === String(savedItem.variantId) &&
          properties[TOKEN_PROPERTY] === expected.token &&
          comparableProperties(properties) === comparableProperties(savedItem.properties);
        return quantity + (matches ? Number(cartItem.quantity) || 0 : 0);
      }, 0);
      return present >= (Number(savedItem.quantity) || 0);
    });
  }

  function render(visible) {
    var container = document.getElementById("restore-cart-checkout");
    var quote = document.getElementById("request_a_quote");
    var draftCreate = document.getElementById("draft_create");
    var alternateActions = [quote, draftCreate].filter(Boolean);
    if (!container) return;
    var hasButton = Boolean(container.querySelector('input[name="checkout"]'));
    var quoteCorrect = alternateActions.every(function (element) {
      return visible ? element.style.display === "none" : element.style.display !== "none";
    });
    if (lastVisible === visible && hasButton === visible && quoteCorrect) return;
    lastVisible = visible;
    container.replaceChildren();

    if (visible) {
      var form = document.createElement("form");
      form.action = "/checkout";
      form.method = "post";
      var button = document.createElement("input");
      button.type = "submit";
      button.name = "checkout";
      button.className = "btn btn--small-wide";
      button.value = "Proceed To Checkout";
      form.appendChild(button);
      container.appendChild(form);
    }

    alternateActions.forEach(function (element) {
      if (!element.hasAttribute("data-share-cart-pro-display")) {
        element.setAttribute("data-share-cart-pro-display", element.style.display || "");
      }
      element.style.display = visible ? "none" : element.getAttribute("data-share-cart-pro-display");
    });
  }

  async function validate() {
    if (!/\/cart\/?$/.test(window.location.pathname) || !document.getElementById("restore-cart-checkout")) return;
    try {
      var cartResponse = await fetch("/cart.js", { credentials: "same-origin", cache: "no-store" });
      if (!cartResponse.ok) return render(false);
      var cart = await cartResponse.json();
      var token = cart.attributes && cart.attributes._saved_cart_token;
      if (!token) return render(false);
      var expectedResponse = await fetch("/apps/saved-cart/status/" + encodeURIComponent(token) + "/", {
        credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
      });
      if (!expectedResponse.ok) return render(false);
      render(isComplete(cart, await expectedResponse.json()));
    } catch (error) {
      console.error("ShareCartPro restored cart validation failed", error);
      render(false);
    }
  }

  function scheduleValidation() {
    clearTimeout(validationTimer);
    validationTimer = setTimeout(validate, 200);
  }

  var originalFetch = window.fetch;
  window.fetch = function () {
    var request = arguments[0];
    var url = typeof request === "string" ? request : request && request.url || "";
    var response = originalFetch.apply(this, arguments);
    if (/\/cart\/(add|change|update|clear)\.js/.test(url)) response.then(scheduleValidation, scheduleValidation);
    return response;
  };

  document.addEventListener("change", scheduleValidation);
  document.addEventListener("click", scheduleValidation);
  new MutationObserver(scheduleValidation).observe(document.documentElement, { childList: true, subtree: true });
  scheduleValidation();
})();
