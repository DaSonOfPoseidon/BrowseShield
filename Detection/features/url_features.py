"""
url_features.py
---------------
Extracts phishing indicators directly from the URL string.
"""

import re
import ipaddress
from urllib.parse import urlparse


from Backend.config import Config


def extract_url_features(url):
    """
    Extract URL-based phishing indicators.
    """

    features = {}

    parsed = urlparse(url)
    domain = parsed.netloc

    features["having_IP_Address"] = having_ip_address(domain)
    features["URL_Length"] = url_length(url)
    features["Shortining_Service"] = shortening_service(domain)
    features["having_At_Symbol"] = having_at_symbol(url)
    features["double_slash_redirecting"] = double_slash_redirect(url)
    features["Prefix_Suffix"] = prefix_suffix(domain)
    features["having_Sub_Domain"] = having_subdomain(domain)
    features["HTTPS_token"] = https_token(domain)
    features["port"] = port_in_url(parsed)
    features["Abnormal_URL"] = abnormal_url(domain)

    return features


def having_ip_address(domain):
    try:
        ipaddress.ip_address(domain)
        return -1
    except ValueError:
        return 1


def url_length(url):
    length = len(url)

    if length < 54:
        return 1
    elif 54 <= length <= 75:
        return 0
    else:
        return -1


def shortening_service(domain):
    for service in Config.SHORTENER_DOMAINS:
        if service in domain:
            return -1
    return 1


def having_at_symbol(url):
    if "@" in url:
        return -1
    return 1


def double_slash_redirect(url):
    if url.rfind("//") > 7:
        return -1
    return 1


def prefix_suffix(domain):
    if "-" in domain:
        return -1
    return 1


def having_subdomain(domain):

    dots = domain.count(".")

    if dots == 1:
        return 1
    elif dots == 2:
        return 0
    else:
        return -1


def https_token(domain):

    if "https" in domain.lower():
        return -1

    return 1


def port_in_url(parsed):

    if parsed.port:
        return -1

    return 1


def abnormal_url(domain):

    if len(domain) == 0:
        return -1

    return 1