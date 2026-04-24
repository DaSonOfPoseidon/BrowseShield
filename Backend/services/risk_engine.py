"""
risk_engine.py
-----------
Heuristic risk scoring engine for BrowseShield.

Evaluates features extracted from URL structure and DOM content to produce
a phishing risk score, human-readable reasons, and confidence estimate.

Available data from the extension
=================================
The extension content script (content.js) sends a PAGE_SCAN message containing:

  url           (str)  — Full page URL
  forms[]       (arr)  — Each: { action, method, hasPasswordField, inputCount }
  links         (obj)  — { total: int, external: int }
  meta          (obj)  — { isHttps: bool, title: str }
  security      (obj)  — From scanSecurity():
      faviconExternal       (bool) — Favicon loaded from different origin
      iframeCount           (int)  — Total iframe count
      hiddenIframeCount     (int)  — Iframes with display:none/visibility:hidden/0-dimension
      rightClickDisabled    (bool) — Page disables context menu
      nullLinkCount         (int)  — Links pointing to #, empty, or javascript:void
      pageTextLength        (int)  — document.body.innerText.length
      hasMetaRefresh        (bool) — <meta http-equiv="refresh"> present
      totalResourceCount    (int)  — Total img[src] + script[src] + link[stylesheet]
      externalResourceCount (int)  — Resources loaded from different origin
"""

from datetime import datetime, timezone


# Scoring weights — tuned so a "definitely phishing" page approaches 1.0
# Each rule: (rule_key, weight, reason_text, wiki_anchor)
# wiki_anchor must match an id="" on an explanation card in Portal/templates/wiki.html
# so the extension can deep-link to /wiki#<anchor>.
RULES = [
    ("has_ip_address",                 0.20, "URL uses an IP address instead of a domain name",        "ip-address"),
    ("has_at_symbol",                  0.15, "URL contains @ symbol — possible redirect trick",        "at-symbol"),
    ("brand_in_subdomain",             0.20, "URL subdomain impersonates a known brand",               "subdomain"),
    ("has_punycode",                   0.15, "Domain uses internationalized characters",               "internationalized-chracters"),
    ("password_form_submits_external", 0.20, "Login form submits credentials to a different domain",   "different-login"),
    ("suspicious_tld",                 0.10, "Domain uses a TLD commonly associated with phishing",    "TLD-phishing"),
    ("has_port",                       0.08, "URL contains a non-standard port number",                "port-number"),
    ("num_subdomains_excessive",       0.10, "URL has excessive subdomains",                           "excessive-subdomains"),
    ("hyphen_count_excessive",         0.08, "Domain contains many hyphens",                           "hyphens"),
    ("https_absent",                   0.05, "Site does not use HTTPS",                                "no-https"),
    ("url_length_excessive",           0.05, "Unusually long URL",                                     "long-url"),
    ("uses_shortening_service",        0.10, "URL uses a link shortening service",                     "link-shortener"),
    ("excessive_url_encoding",         0.08, "URL contains excessive percent-encoding",                "percent-encoding"),
    ("has_password_field",             0.05, "Page contains a login form",                             "login-form"),
    ("favicon_is_external",            0.10, "Page favicon loaded from external domain",               "external-favicon"),
    ("hidden_iframes",                 0.10, "Page contains hidden iframes",                           "hidden-iframes"),
    ("right_click_disabled",           0.08, "Page disables right-click (prevents inspection)",        "right-click-disabled"),
    ("null_links_excessive",           0.08, "Many non-functional links on page",                      "non-functional-links"),
    ("thin_page_with_login",           0.10, "Thin page with login form (minimal content)",            "thin-login"),
    ("has_meta_refresh",               0.08, "Page uses auto-redirect",                                "auto-redirect"),
    ("external_resource_ratio_high",   0.08, "Most page resources loaded from external domains",       "external-resources"),
]


def evaluate_risk(features):
    """Score features and return risk assessment with reasons."""
    score = 0.0
    reasons = []
    fired = 0
    total_checked = len(RULES)

    for rule_key, weight, reason, anchor in RULES:
        value = features.get(rule_key, 0)
        if value:
            score += weight
            reasons.append({"text": reason, "anchor": anchor})
            fired += 1

    score = round(min(score, 1.0), 3)

    # Classification
    if score >= 0.6:
        safety = "unsafe"
    elif score >= 0.3:
        safety = "suspicious"
    else:
        safety = "safe"

    # Confidence: more signals firing = more confident in unsafe/suspicious
    # More signals checked clean = more confident in safe
    if safety == "safe":
        confidence = min(95, 50 + (total_checked - fired) * 3)
    else:
        confidence = min(95, 40 + fired * 5)

    # Map safety to DB-compatible classification
    classification_map = {"unsafe": "phishing", "suspicious": "suspicious", "safe": "safe"}

    return {
        "safety": safety,
        "confidence": confidence,
        "reasons": reasons,
        "heuristic_score": score,
        "ml_score": None,
        "final_score": score,
        "classification": classification_map[safety],
        "assessed_at": datetime.now(timezone.utc).isoformat(),
    }
