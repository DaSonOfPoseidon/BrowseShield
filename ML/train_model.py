import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib

# Load dataset
df = pd.read_csv("ML/datasets/phishing_training_data.csv")

# Fix inverted labels from prepare_dataset.py:
# The script mapped UCI Result=-1 (phishing) to label=0 and Result=1
# (legitimate) to label=1, but label=1 should mean phishing.
df["label"] = df["label"].map({0: 1, 1: 0})

# Drop features with no runtime data source (external APIs) or toxic
# training distribution (Prefix_Suffix: only phish samples have value 1).
DROP_FEATURES = [
    "web_traffic",
    "Page_Rank",
    "Google_Index",
    "Statistical_report",
    "Prefix_Suffix",
]
df = df.drop(columns=DROP_FEATURES)

X = df.drop("label", axis=1)
y = df["label"]

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    random_state=42,
    class_weight="balanced",
)

model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)

print(classification_report(y_test, predictions))

# Save model
joblib.dump(model, "ML/model.pkl")

print("Model saved to model.pkl")
