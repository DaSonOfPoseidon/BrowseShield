"""
convert_arff.py
---------------
Converts the UCI phishing dataset from ARFF format to CSV.
"""

import pandas as pd
from scipy.io import arff

# Load ARFF file
data, meta = arff.loadarff("phishing.arff")

# Convert to pandas dataframe
df = pd.DataFrame(data)

# Decode byte strings if needed
for column in df.select_dtypes([object]):
    df[column] = df[column].str.decode("utf-8")

# Save CSV
df.to_csv("phishing_uci.csv", index=False)

print("Conversion complete: phishing_uci.csv created")
print("Shape:", df.shape)