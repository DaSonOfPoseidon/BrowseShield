// Runs on page load

function scanPage() {
  const results = {
    url: window.location.href,
    forms: scanForms(),
    links: scanLinks(),
    meta: scanMeta()
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scanPage);
} else {
  scanPage();
}
