-- BrowseShield E2E Test Database Seed
-- Tables in correct dependency order (fixes Data/schema.sql ordering bug)

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analysis_requests (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    source TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

-- Test user: e2e@browseshield.test / testpass123
INSERT INTO users (email, password, name)
VALUES ('e2e@browseshield.test', '$2b$12$pNERRbNXGRizOHuFEOHLEu1SryqztUkbGQJRGKF.md7NvKyrTwyxC', 'E2E Test User');
