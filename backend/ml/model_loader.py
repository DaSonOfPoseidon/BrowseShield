"""
model_loader.py
---------------
Loads the trained ML model once at application startup.
"""

import joblib

MODEL_PATH = "Backend/ml/model.pkl"

model = joblib.load(MODEL_PATH)