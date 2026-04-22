"""
predictor.py
------------

Runs machine learning inference for phishing detection.
"""

import numpy as np

from Backend.ml.model_loader import model
from Backend.config.feature_order import FEATURE_ORDER
from ML.model_loader import model

def build_feature_vector(features):
    """
    Convert feature dictionary into ordered vector required by the ML model.
    """

    vector = []

    for feature in FEATURE_ORDER:
        value = float(features.get(feature, 0))
        vector.append(value)

    if len(vector) != len(FEATURE_ORDER):
        raise ValueError("Feature vector length mismatch")

    return np.array(vector).reshape(1, -1)


def predict_phishing(features):

    feature_vector = build_feature_vector(features)

    probability = model.predict_proba(feature_vector)[0][1]

    prediction = 1 if probability > 0.55 else 0

    return {
        "prediction": prediction,
        "probability": float(probability)
    }