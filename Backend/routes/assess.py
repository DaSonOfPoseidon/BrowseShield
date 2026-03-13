"""
assess.py
-------
API endpoints for analyzing URLs and emails using the BrowseShield detection engine.
"""

from datetime import datetime, timezone
from urllib.parse import urlparse

from flask import Blueprint, request, jsonify

from Backend.services.features import build_url_features
from Backend.services.risk_engine import evaluate_risk
from Backend.db.connection import get_db_connection
from Backend.db.queries import (
    INSERT_ANALYSIS_REQUEST,
    INSERT_FEATURE,
    INSERT_DETECTION_RESULT,
)
from Backend.utils.auth import jwt_required

assess_bp = Blueprint("assess", __name__)


@assess_bp.route("/assess", methods=["POST"])
@jwt_required
def assess_url():
    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "URL required"}), 400

    url = data["url"]
    if not isinstance(url, str) or len(url) > 2048:
        return jsonify({"error": "Invalid URL: must be a string under 2048 characters"}), 400

    parsed_url = urlparse(url)
    if not parsed_url.scheme or not parsed_url.netloc:
        return jsonify({"error": "Invalid URL: must include scheme and host"}), 400

    scan_data = data.get("scan_data", {})
    if not isinstance(scan_data, dict):
        return jsonify({"error": "Invalid scan_data: must be an object"}), 400

    features = build_url_features(url, scan_data)
    result = evaluate_risk(features)

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(INSERT_ANALYSIS_REQUEST, (url, "api"))
            analysis_id = cursor.fetchone()[0]

            for feature_name, value in features.items():
                cursor.execute(
                    INSERT_FEATURE,
                    (analysis_id, feature_name, float(value) if value is not None else 0.0),
                )

            cursor.execute(
                INSERT_DETECTION_RESULT,
                (
                    analysis_id,
                    result["heuristic_score"],
                    result["ml_score"],
                    result["final_score"],
                    result["classification"],
                ),
            )

            conn.commit()

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(result)


# ── Available email data from extension ──
# The extension's email-scanner.js extracts the following per email:
#
# sender.name        (str) — Display name, e.g. "PayPal Security"
# sender.address     (str) — Email address, e.g. "noreply@paypal.com"
# subject            (str) — Email subject line
# bodyText           (str) — Plain text body (max 5000 chars), stripped of:
#                            - Quoted replies (blockquotes, > prefixed lines)
#                            - Signatures (Gmail .gmail_signature, Outlook #Signature)
# links[]            (arr) — Each: { href: str, displayText: str }
#                            - href is the actual destination URL
#                            - displayText is what the user sees (may look like a different URL)
# attachments[]      (arr) — Filenames as strings, e.g. ["invoice.pdf", "report.xlsx"]
# authInfo           (obj|null) — Gmail only, extracted from sender details panel:
#                            - mailedBy: domain that sent the email
#                            - signedBy: DKIM signing domain
#                            - encryption: "TLS" if standard encryption detected
# provider           (str) — "gmail", "outlook", or "generic"
# emailId            (str) — Unique email identifier from URL
# extractedAt        (str) — ISO timestamp of extraction
#
# Suggested heuristic features for email assessment:
# - sender_domain_mismatch: sender.name contains brand but sender.address domain differs
# - display_url_mismatch: link displayText looks like URL but href domain doesn't match
# - urgency_keywords: subject/body contains "urgent", "verify", "suspended", "act now", etc.
# - risky_attachments: .exe, .scr, .zip, .js, .vbs, .bat, .cmd, .msi, .ps1
# - auth_mismatch: authInfo.mailedBy doesn't match sender.address domain
# - no_encryption: authInfo.encryption is absent
# - freemail_business: sender uses gmail/yahoo/hotmail but name implies organization


@assess_bp.route("/assess/email", methods=["POST"])
@jwt_required
def assess_email():
    data = request.get_json()

    if not data:
        return jsonify({"error": "validation_error", "message": "Request body required"}), 400

    # TODO: Mike — add email processing logic using the data documented above
    return jsonify({
        "safety": "suspicious",
        "confidence": 50,
        "reasons": ["Email analysis not yet implemented"],
        "phishingIndicators": {},
        "assessed_at": datetime.now(timezone.utc).isoformat(),
    })
