CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE analysis_requests (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    source TEXT,
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE extracted_features (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL
        REFERENCES analysis_requests(id)
        ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    feature_value INTEGER NOT NULL
);


CREATE TABLE detection_results (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL
        REFERENCES analysis_requests(id)
        ON DELETE CASCADE,
    heuristic_score FLOAT NOT NULL,
    ml_score FLOAT NOT NULL,
    final_score FLOAT NOT NULL,
    classification TEXT NOT NULL
        CHECK (classification IN ('safe','suspicious','phishing')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_analysis_url
ON analysis_requests(url);


CREATE INDEX idx_analysis_user
ON analysis_requests(user_id);


CREATE INDEX idx_feature_analysis
ON extracted_features(analysis_id);


CREATE INDEX idx_results_analysis
ON detection_results(analysis_id);


CREATE INDEX idx_results_classification
ON detection_results(classification);