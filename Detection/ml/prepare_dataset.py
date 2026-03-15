"""
prepare_dataset.py
------------------
Loads and cleans the UCI phishing dataset for BrowseShield ML training.
"""

import pandas as pd

# Load dataset
df = pd.read_csv("phishing_uci.csv")

print("Original shape:", df.shape)

# Rename target column if needed
if "Result" in df.columns:
    df.rename(columns={"Result": "label"}, inplace=True)

# Convert labels
# -1 -> 0 (legitimate)
#  1 -> 1 (phishing)
df["label"] = df["label"].replace(-1, 0)

# Verify values
print("Label distribution:")
print(df["label"].value_counts())

# Save cleaned dataset
df.to_csv("phishing_clean.csv", index=False)

print("Clean dataset saved as phishing_clean.csv")