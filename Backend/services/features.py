"""
features.py
-----------
Heuristic feature extraction for URL and email assessment.
"""

import re
from urllib.parse import urlparse

from Backend.config import Config


def build_url_features(url, scan_data):
    """Extract all heuristic features from URL string and DOM scan data."""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    path = parsed.path or ""

    # --- URL-derived features ---
    features = {}

    features["url_length_excessive"] = 1 if len(url) > 75 else 0
    features["num_subdomains_excessive"] = 1 if max(0, hostname.count(".") - 1) >= 3 else 0
    features["has_ip_address"] = (
        1 if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", hostname) or hostname.startswith("[") else 0
    )
    features["https_absent"] = 0 if parsed.scheme == "https" else 1
    features["hyphen_count_excessive"] = 1 if hostname.count("-") >= 3 else 0

    # @ in authority portion (before first /)
    authority = url.split("//", 1)[-1].split("/", 1)[0] if "//" in url else ""
    features["has_at_symbol"] = 1 if "@" in authority else 0

    features["has_punycode"] = 1 if "xn--" in hostname else 0

    tld = hostname.rsplit(".", 1)[-1] if "." in hostname else ""
    features["suspicious_tld"] = 1 if tld in Config.SUSPICIOUS_TLDS else 0

    features["has_port"] = 1 if parsed.port and parsed.port not in (80, 443) else 0
    features["excessive_url_encoding"] = 1 if url.count("%") > 3 else 0
    features["uses_shortening_service"] = 1 if hostname in Config.SHORTENER_DOMAINS else 0

    # Brand impersonation: known brand in subdomain but not in registered domain
    labels = hostname.split(".")
    if len(labels) >= 3:
        registered = ".".join(labels[-2:]).lower()
        subdomain_labels = [l.lower() for l in labels[:-2]]
        for brand in Config.KNOWN_BRANDS:
            if any(brand in label for label in subdomain_labels) and brand not in registered:
                features["brand_in_subdomain"] = 1
                break
    features.setdefault("brand_in_subdomain", 0)

    # --- DOM-derived features ---
    forms = scan_data.get("forms", [])
    security = scan_data.get("security", {})

    # Password form submits externally
    password_external = 0
    has_password = 0
    for form in forms:
        if form.get("hasPasswordField"):
            has_password = 1
            action = form.get("action", "")
            if action:
                try:
                    action_host = urlparse(action).hostname or ""
                    if action_host and action_host != hostname:
                        password_external = 1
                except Exception:
                    pass

    features["has_password_field"] = has_password
    features["password_form_submits_external"] = password_external
    features["favicon_is_external"] = 1 if security.get("faviconExternal") else 0
    features["hidden_iframes"] = 1 if security.get("hiddenIframeCount", 0) > 0 else 0
    features["right_click_disabled"] = 1 if security.get("rightClickDisabled") else 0
    features["null_links_excessive"] = 1 if security.get("nullLinkCount", 0) > 5 else 0

    page_text_length = security.get("pageTextLength", 0)
    features["thin_page_with_login"] = 1 if page_text_length < 500 and has_password else 0

    features["has_meta_refresh"] = 1 if security.get("hasMetaRefresh") else 0

    total_resources = security.get("totalResourceCount", 0)
    external_resources = security.get("externalResourceCount", 0)
    ratio = external_resources / max(1, total_resources)
    features["external_resource_ratio_high"] = 1 if ratio > 0.8 else 0

    return features
