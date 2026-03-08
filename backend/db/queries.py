"""
queries.py
----------

Centralized SQL queries for BrowseShield.
This keeps database logic separate from API routes.
"""

# ---------------------------
# INSERT QUERIES
# ---------------------------

INSERT_ANALYSIS_REQUEST = """
INSERT INTO analysis_requests (url, source)
VALUES (%s, %s)
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