"""
models.py
---------
Data structures used by the BrowseShield backend when
interacting with the PostgreSQL database.
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class AnalysisRequest:
    id: int
    url: str
    source: str
    submitted_at: datetime


@dataclass
class ExtractedFeature:
    id: int
    analysis_id: int
    feature_name: str
    feature_value: float


@dataclass
class DetectionResult:
    id: int
    analysis_id: int
    heuristic_score: float
    ml_score: float
    final_score: float
    classification: str
    created_at: datetime
