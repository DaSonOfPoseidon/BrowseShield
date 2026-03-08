"""
models.py
---------

Defines data structures used by the BrowseShield backend when
interacting with the PostgreSQL database.

BrowseShield intentionally avoids storing real browsing history.
These models only represent evaluation data used for detection metrics.
"""

from dataclasses import dataclass
from datetime import datetime


# -----------------------------
# Analysis Request
# -----------------------------

@dataclass
class AnalysisRequest:
    """
    Represents a URL submitted to the detection engine.
    """
    id: int
    url: str
    source: str
    submitted_at: datetime


# -----------------------------
# Extracted Feature
# -----------------------------

@dataclass
class ExtractedFeature:
    """
    Represents a single extracted feature from a scanned URL.
    """
    id: int
    analysis_id: int
    feature_name: str
    feature_value: float


# -----------------------------
# Detection Result
# -----------------------------

@dataclass
class DetectionResult:
    """
    Represents the classification output of the detection engine.
    """
    id: int
    analysis_id: int
    heuristic_score: float
    ml_score: float
    final_score: float
    classification: str
    created_at: datetime