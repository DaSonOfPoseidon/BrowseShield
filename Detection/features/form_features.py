"""
form_features.py
----------------
Processes DOM-based indicators extracted by the browser extension.
These features help detect phishing behavior within page content.
"""


def extract_form_features(page_data):
    """
    Convert extension-provided DOM indicators into ML-ready features.
    """

    features = {}

    features["Request_URL"] = page_data.get("request_url", 0)
    features["URL_of_Anchor"] = page_data.get("url_of_anchor", 0)
    features["Links_in_tags"] = page_data.get("links_in_tags", 0)

    features["SFH"] = page_data.get("sfh", 0)
    features["Submitting_to_email"] = page_data.get("submitting_to_email", 0)

    features["Iframe"] = page_data.get("iframe", 0)
    features["popUpWidnow"] = page_data.get("popup_window", 0)

    features["RightClick"] = page_data.get("right_click_disabled", 0)
    features["on_mouseover"] = page_data.get("on_mouseover", 0)

    features["Redirect"] = page_data.get("redirect", 0)

    return features