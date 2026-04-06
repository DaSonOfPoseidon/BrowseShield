# BrowseShield - ML Scoring Engine

Binary classification model for phishing detection. Uses a 30-feature scikit-learn classifier trained on a UCI phishing dataset.

**Owner:** Mike

---

## Tech Stack

- **Model:** scikit-learn classifier (stored as `model.pkl`)
- **Serialization:** joblib
- **Inference:** numpy

## Directory Structure

```
ML/
├── model_loader.py         # Loads model.pkl at application startup
├── predictor.py            # Inference wrapper — build_feature_vector(), predict_phishing()
├── train_model.py          # Model training script
├── prepare_dataset.py      # Dataset preparation
├── model.pkl               # Trained model artifact
├── datasets/
│   ├── phishing.arff       # Original UCI phishing dataset (ARFF format)
│   ├── phishing_uci.csv    # UCI dataset converted to CSV
│   └── phishing_training_data.csv
└── scripts/
    └── convert_arff.py     # ARFF → CSV conversion utility
```

## Features (30)

The model expects a 30-feature vector in this exact order:

| # | Feature | Description |
|---|---------|-------------|
| 1 | `having_IP_Address` | URL contains IP address |
| 2 | `URL_Length` | URL character count |
| 3 | `Shortining_Service` | URL shortener detected |
| 4 | `having_At_Symbol` | @ symbol in URL |
| 5 | `double_slash_redirecting` | Double-slash redirect |
| 6 | `Prefix_Suffix` | Hyphen in domain |
| 7 | `having_Sub_Domain` | Subdomain depth |
| 8 | `SSLfinal_State` | SSL certificate state |
| 9 | `Domain_registeration_length` | Domain registration duration |
| 10 | `Favicon` | External favicon source |
| 11 | `port` | Non-standard port usage |
| 12 | `HTTPS_token` | HTTPS in domain name (not protocol) |
| 13 | `Request_URL` | External resource ratio |
| 14 | `URL_of_Anchor` | Anchor URL analysis |
| 15 | `Links_in_tags` | External links in tags |
| 16 | `SFH` | Server form handler |
| 17 | `Submitting_to_email` | Form submits to email |
| 18 | `Abnormal_URL` | URL anomaly detection |
| 19 | `Redirect` | Redirect count |
| 20 | `on_mouseover` | JavaScript mouseover tricks |
| 21 | `RightClick` | Right-click disabled |
| 22 | `popUpWidnow` | Popup window usage |
| 23 | `Iframe` | Hidden iframe presence |
| 24 | `age_of_domain` | Domain age |
| 25 | `DNSRecord` | DNS record availability |
| 26 | `web_traffic` | Traffic ranking |
| 27 | `Page_Rank` | Page rank score |
| 28 | `Google_Index` | Google indexing status |
| 29 | `Links_pointing_to_page` | Inbound link count |
| 30 | `Statistical_report` | Statistical report match |

## Usage

The model is loaded once at Backend startup via `model_loader.py`. The Backend's `scoring_service.py` calls `predict_phishing(features)` which returns:

```json
{
  "prediction": 0,
  "probability": 0.23
}
```

- `prediction`: 0 (legitimate) or 1 (phishing)
- `probability`: phishing probability (0.0 - 1.0)

The Backend blends this with heuristic scores to produce the final risk assessment.

## Training

```bash
python prepare_dataset.py    # Prepare training data from datasets/
python train_model.py        # Train and save model.pkl
```
