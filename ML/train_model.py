import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib

from Detection.features.feature_extractor import extract_features
from collections import Counter
from Backend.config.feature_order import FEATURE_ORDER

# ==============================
# LOAD DATASET
# ==============================
df = pd.read_csv("ML/datasets/final_dataset.csv")

# Clean dataset
df = df.dropna(subset=["url"])
df = df[df["url"].astype(str).str.strip() != ""]

# ==============================
# BALANCE DATASET
# ==============================
sample_size = min(30000, len(df[df["label"] == 0]), len(df[df["label"] == 1]))

safe_df = df[df["label"] == 0].sample(sample_size, random_state=42)
phish_df = df[df["label"] == 1].sample(sample_size, random_state=42)

df = pd.concat([safe_df, phish_df]).sample(frac=1).reset_index(drop=True)

X = []
y = []

print("[INFO] Extracting features...")

# ==============================
# FEATURE EXTRACTION
# ==============================
for _, row in df.iterrows():
    url = row["url"]
    label = row["label"]

    if not isinstance(url, str):
        continue

    try:
        features = extract_features(url, training_mode=True)
        X.append([features.get(f, 0) for f in FEATURE_ORDER])
        y.append(label)
    except Exception as e:
        print(f"[WARN] Skipping {url}: {e}")

print(f"[INFO] Total usable records: {len(X)}")

# ==============================
# SPLIT DATA
# ==============================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ==============================
# TRAIN MODEL
# ==============================
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    class_weight="balanced",  # IMPORTANT
    random_state=42
)

model.fit(X_train, y_train)

# ==============================
# EVALUATE 
# ==============================

probs = model.predict_proba(X_test)[:, 1]

# Adjust threshold here (0.5 default → 0.6 stricter)
predictions = (probs > 0.55).astype(int)

print("\n[ACCURACY]")
print(accuracy_score(y_test, predictions))

print("\n[CLASSIFICATION REPORT]")
print(classification_report(y_test, predictions))

print("\n[CONFUSION MATRIX]")
print(confusion_matrix(y_test, predictions))

# ==============================
# SAVE MODEL
# ==============================
joblib.dump(model, "ML/model.pkl")

print("\n[SUCCESS] Model saved")
print(Counter(y))
print(X[0])
print(X[100])