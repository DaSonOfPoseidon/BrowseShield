import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib

from Detection.features.feature_extractor import extract_features
from collections import Counter
# Load dataset
df = pd.read_csv("ML/datasets/phishing_training_data.csv")

FEATURE_ORDER = [
    "having_IP_Address",
    "URL_Length",
    "Shortining_Service",
    "having_At_Symbol",
    "double_slash_redirecting",
    "Prefix_Suffix",
    "having_Sub_Domain",
    "HTTPS_token",
    "port",
    "Abnormal_URL",

    # domain placeholders
    "domain_age",
    "dns_record",
    "domain_validity",
    "domain_length",

    "suspicious_keyword_count",
    "url_encoding_count",
    "hyphen_count",
    "suspicious_tld",
    "digit_ratio",
    "digit_count"

]

# ==============================
# LOAD DATASET
# ==============================
df = pd.read_csv("Backend/datasets/final_dataset.csv")

# Clean dataset
df = df.dropna(subset=["url"])
df = df[df["url"].astype(str).str.strip() != ""]

# ==============================
# BALANCE DATASET
# ==============================
safe_df = df[df["label"] == 0].sample(30000, random_state=42)
phish_df = df[df["label"] == 1].sample(30000, random_state=42)

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
    random_state=42
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
# Save model
joblib.dump(model, "ML/model.pkl")

# ==============================
# SAVE MODEL
# ==============================
joblib.dump(model, "Backend/ml/model.pkl")

print("\n[SUCCESS] Model saved")
print(Counter(y))
print(X[0])
print(X[100])