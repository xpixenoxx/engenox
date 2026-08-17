-- init-pgvector.sql — Initialize pgvector extension
-- Runs as part of docker-entrypoint-initdb.d

-- Create the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';