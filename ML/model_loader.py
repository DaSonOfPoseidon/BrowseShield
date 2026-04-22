"""
model_loader.py
---------------
Loads the trained ML model once at application startup.
"""

import os
import joblib

# Get file directory path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Build path to model
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")

# Load model
model = joblib.load(MODEL_PATH)