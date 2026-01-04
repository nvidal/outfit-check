-- Reset the `scans` table to match the new multi-persona schema.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS scans;

CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_name TEXT,
  image_url TEXT NOT NULL,
  occasion TEXT NOT NULL,
  language VARCHAR(5) NOT NULL,
  ai_results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
