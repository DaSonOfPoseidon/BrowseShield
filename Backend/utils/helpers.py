"""
helpers.py
-----------

"""

from urllib.parse import urlparse


def normalize_url(url):

    parsed = urlparse(url)

    return parsed.geturl().lower()


def safe_float(value, default=0.0):

    try:
        return float(value)

    except Exception:
        return default