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


-- Añadir columna para rastrear la IP y mejorar la seguridad
ALTER TABLE scans ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Opcional: Crear un índice para que el rate limiting sea ultra rápido
CREATE INDEX IF NOT EXISTS idx_scans_ip_created ON scans (ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_scans_user_created ON scans (user_id, created_at);


-- Table for "Style Me" recommendations
CREATE TABLE IF NOT EXISTS styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  image_url TEXT NOT NULL,
  generated_image_url TEXT,
  request_text TEXT NOT NULL,
  language VARCHAR(5) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_styles_user_created ON styles (user_id, created_at);