from scipy.io import arff
import pandas as pd

data = arff.loadarff("dataset/phishing.arff")

df = pd.DataFrame(data[0])

df.to_csv("dataset/phishing_uci.csv", index=False)

print("Converted to CSV")