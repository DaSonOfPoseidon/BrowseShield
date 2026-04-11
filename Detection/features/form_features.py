"""
form_features.py
----------------
Processes DOM-based indicators extracted by the browser extension.

The extension sends scan_data as nested objects:
  { forms: [...], links: { total, external }, meta: {...}, security: {...} }

This module maps that structure into ML-ready features matching the
trained model's expected feature names.
"""

from urllib.parse import urlparse


def extract_form_features(page_data, url=None):
    """
    Convert extension-provided DOM indicators into ML-ready features.
    """
    features = {}

    page_hostname = urlparse(url).hostname or "" if url else ""

    forms = page_data.get("forms", [])
    links = page_data.get("links", {})
    security = page_data.get("security", {})

    # Request_URL: ratio of external resources (1=legit, 0=suspicious, -1=phishing)
    total_resources = security.get("totalResourceCount", 0)
    external_resources = security.get("externalResourceCount", 0)
    if total_resources == 0:
        features["Request_URL"] = 1
    else:
        ratio = external_resources / total_resources
        if ratio < 0.22:
            features["Request_URL"] = 1
        elif ratio < 0.61:
            features["Request_URL"] = 0
        else:
            features["Request_URL"] = -1

    # URL_of_Anchor: ratio of null/external anchors
    total_links = links.get("total", 0)
    null_count = security.get("nullLinkCount", 0)
    external_links = links.get("external", 0)
    if total_links == 0:
        features["URL_of_Anchor"] = 1
    else:
        anchor_ratio = (null_count + external_links) / total_links
        if anchor_ratio < 0.31:
            features["URL_of_Anchor"] = 1
        elif anchor_ratio < 0.67:
            features["URL_of_Anchor"] = 0
        else:
            features["URL_of_Anchor"] = -1

    # Links_in_tags: external links in meta/script/link tags
    if total_resources == 0:
        features["Links_in_tags"] = 1
    else:
        ratio = external_resources / total_resources
        if ratio < 0.17:
            features["Links_in_tags"] = 1
        elif ratio < 0.81:
            features["Links_in_tags"] = 0
        else:
            features["Links_in_tags"] = -1

    # SFH: Server Form Handler — does the form action point elsewhere?
    sfh_value = 1
    for form in forms:
        action = form.get("action", "")
        if not action or action in ("", "about:blank"):
            sfh_value = -1
            break
        try:
            action_host = urlparse(action).hostname or ""
            if action_host and action_host != page_hostname:
                sfh_value = 0
                break
        except Exception:
            pass
    features["SFH"] = sfh_value

    # Submitting_to_email: form action uses mailto:
    submitting_to_email = 1
    for form in forms:
        action = form.get("action", "")
        if "mailto:" in action.lower():
            submitting_to_email = -1
            break
    features["Submitting_to_email"] = submitting_to_email

    # Iframe: hidden iframes present
    hidden_iframes = security.get("hiddenIframeCount", 0)
    features["Iframe"] = -1 if hidden_iframes > 0 else 1

    # popUpWidnow: popup detection (from security scan)
    features["popUpWidnow"] = -1 if security.get("popupDetected") else 1

    # RightClick: context menu disabled
    features["RightClick"] = -1 if security.get("rightClickDisabled") else 1

    # on_mouseover: status bar manipulation
    features["on_mouseover"] = -1 if security.get("onMouseoverDetected") else 1

    # Redirect: based on meta refresh or excessive redirects
    features["Redirect"] = -1 if security.get("hasMetaRefresh") else 1

    # SSLfinal_State: HTTPS presence (1=HTTPS/legit, -1=no HTTPS/phishing)
    meta = page_data.get("meta", {})
    is_https = meta.get("isHttps")
    if is_https is True:
        features["SSLfinal_State"] = 1
    elif is_https is False:
        features["SSLfinal_State"] = -1
    else:
        features["SSLfinal_State"] = 0

    # Favicon: external favicon signals phishing
    features["Favicon"] = -1 if security.get("faviconExternal") else 1

    # Links_pointing_to_page: proxy via on-page link count (site complexity)
    total_link_count = links.get("total", 0)
    if total_link_count >= 50:
        features["Links_pointing_to_page"] = 1
    elif total_link_count >= 10:
        features["Links_pointing_to_page"] = 0
    else:
        features["Links_pointing_to_page"] = -1

    return features
