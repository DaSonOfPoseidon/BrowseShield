// Runs on page load

function scanPage() {
  const results = {
    url: window.location.href,
    forms: scanForms(),
    links: scanLinks(),
    meta: scanMeta(),
    security: scanSecurity()
  };

  chrome.runtime.sendMessage({ type: "PAGE_SCAN", data: results });
}

function scanForms() {
  const forms = document.querySelectorAll("form");
  return Array.from(forms).map(form => ({
    action: form.action,
    method: form.method,
    hasPasswordField: !!form.querySelector('input[type="password"]'),
    inputCount: form.querySelectorAll("input").length
  }));
}

function scanLinks() {
  const links = document.querySelectorAll("a[href]");
  const externalLinks = [];

  for (const link of links) {
    try {
      const linkUrl = new URL(link.href);
      if (linkUrl.origin !== window.location.origin) {
        externalLinks.push({
          href: link.href,
          text: link.textContent.trim().slice(0, 100)
        });
      }
    } catch {
      // skip malformed URLs
    }
  }

  return { total: links.length, external: externalLinks.length };
}

function scanMeta() {
  const isHttps = window.location.protocol === "https:";
  const title = document.title;

  return { isHttps, title };
}

function scanSecurity() {
  // Favicon source
  const faviconEl = document.querySelector('link[rel~="icon"]');
  let faviconExternal = false;
  if (faviconEl?.href) {
    try {
      faviconExternal = new URL(faviconEl.href).origin !== window.location.origin;
    } catch {}
  }

  // Hidden iframes
  const iframes = document.querySelectorAll("iframe");
  let hiddenIframeCount = 0;
  for (const iframe of iframes) {
    const style = window.getComputedStyle(iframe);
    if (style.display === "none" || style.visibility === "hidden"
        || iframe.width === "0" || iframe.height === "0") {
      hiddenIframeCount++;
    }
  }

  // Right-click disabled
  const rightClickDisabled = document.body?.getAttribute("oncontextmenu")?.includes("return false")
    || !!document.querySelector('[oncontextmenu*="return false"]');

  // Null/dead links
  const allLinks = document.querySelectorAll("a[href]");
  let nullLinkCount = 0;
  for (const link of allLinks) {
    const href = link.getAttribute("href");
    if (href === "#" || href === "" || href.startsWith("javascript:")) {
      nullLinkCount++;
    }
  }

  // Page content volume
  const pageTextLength = document.body?.innerText?.length || 0;

  // Meta refresh
  const hasMetaRefresh = !!document.querySelector('meta[http-equiv="refresh"]');

  // External resources (images, scripts, stylesheets)
  const resources = [
    ...document.querySelectorAll("img[src]"),
    ...document.querySelectorAll("script[src]"),
    ...document.querySelectorAll('link[rel="stylesheet"][href]'),
  ];
  let externalResourceCount = 0;
  for (const res of resources) {
    const src = res.src || res.href;
    try {
      if (src && new URL(src).origin !== window.location.origin) {
        externalResourceCount++;
      }
    } catch {}
  }

  // Popup detection: inline handlers calling window.open
  const popupDetected = !!document.querySelector(
    '[onclick*="window.open"], [onload*="window.open"]'
  );

  // Mouseover status bar manipulation
  const onMouseoverDetected = !!document.querySelector(
    '[onmouseover*="window.status"]'
  );

  return {
    faviconExternal,
    iframeCount: iframes.length,
    hiddenIframeCount,
    rightClickDisabled,
    nullLinkCount,
    pageTextLength,
    hasMetaRefresh,
    totalResourceCount: resources.length,
    externalResourceCount,
    popupDetected,
    onMouseoverDetected,
  };
}

function detectWebmail() {
  const host = window.location.hostname;
  // Skip known providers (they get the scanner via manifest matches)
  if (host === "mail.google.com" || /outlook\.(office|live|office365)\.com/.test(host)) return;

  const hasMailtoLinks = document.querySelectorAll('a[href^="mailto:"]').length > 0;
  const hasEmailHeaders = !!document.body?.textContent.match(/\b(From|Subject|Inbox|Compose)\b/gi);
  const hasMessageList = document.querySelectorAll('[role="listitem"], [role="row"]').length > 5;

  if (hasMailtoLinks && hasEmailHeaders && hasMessageList) {
    chrome.runtime.sendMessage({ type: "MAYBE_WEBMAIL", data: { url: window.location.href } });
  }
}

// Export for testing (no-op in browser)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { scanForms, scanLinks, scanMeta, scanSecurity, detectWebmail, scanPage };
}

if (typeof module === "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scanPage();
      detectWebmail();
    });
  } else {
    scanPage();
    detectWebmail();
  }
}
