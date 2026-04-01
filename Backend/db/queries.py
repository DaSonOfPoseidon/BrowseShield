"""
queries.py
----------
Centralized SQL queries for BrowseShield.
"""

# ---------------------------
# INSERT QUERIES
# ---------------------------

INSERT_ANALYSIS_REQUEST = """
INSERT INTO analysis_requests (url, source, user_id)
VALUES (%s, %s, %s)
RETURNING id;
"""

INSERT_FEATURE = """
INSERT INTO extracted_features
(analysis_id, feature_name, feature_value)
VALUES (%s, %s, %s);
"""

INSERT_DETECTION_RESULT = """
INSERT INTO detection_results
(analysis_id, heuristic_score, ml_score, final_score, classification)
VALUES (%s, %s, %s, %s, %s);
"""

# ---------------------------
# METRICS QUERIES
# ---------------------------

COUNT_TOTAL_SCANS = """
SELECT COUNT(*) FROM analysis_requests;
"""

COUNT_PHISHING = """
SELECT COUNT(*)
FROM detection_results
WHERE classification = 'phishing';
"""

COUNT_SAFE = """
SELECT COUNT(*)
FROM detection_results
WHERE classification = 'safe';
"""

COUNT_SUSPICIOUS = """
SELECT COUNT(*)
FROM detection_results
WHERE classification = 'suspicious';
"""

AVERAGE_RISK_SCORE = """
SELECT AVG(final_score)
FROM detection_results;
"""

# ---------------------------
# AUTH QUERIES
# ---------------------------

GET_USER_BY_EMAIL = """
SELECT id, email, password, name FROM users WHERE email = %s;
"""

GET_USER_BY_ID = """
SELECT id, email, name FROM users WHERE id = %s;
"""

INSERT_REFRESH_TOKEN = """
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES (%s, %s, %s);
"""

GET_REFRESH_TOKEN = """
SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = %s;
"""

DELETE_REFRESH_TOKEN = """
DELETE FROM refresh_tokens WHERE token_hash = %s;
"""

DELETE_USER_REFRESH_TOKENS = """
DELETE FROM refresh_tokens WHERE user_id = %s;
"""
