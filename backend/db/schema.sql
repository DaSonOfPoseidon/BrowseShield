CREATE TABLE analysis_requests (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    source TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE extracted_features (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES analysis_requests(id),
    feature_name TEXT,
    feature_value FLOAT
);

CREATE TABLE detection_results (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES analysis_requests(id),
    heuristic_score FLOAT,
    ml_score FLOAT,
    final_score FLOAT,
    classification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_url ON analysis_requests(url);
CREATE INDEX idx_feature_analysis ON extracted_features(analysis_id);
CREATE INDEX idx_results_analysis ON detection_results(analysis_id);