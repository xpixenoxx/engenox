-- init-age.sql — Initialize Apache AGE extension on Postgres
-- Runs as part of docker-entrypoint-initdb.d

-- Create the AGE extension
CREATE EXTENSION IF NOT EXISTS age;

-- Load the AGE library (required for cypher function)
LOAD 'age';

-- Set search path to include AGE catalog
SET search_path = ag_catalog, "$user", public;

-- Create the graph namespace for Engenox
SELECT create_graph('engenox_kg');

-- Verify installation
-- Note: AGE doesn't expose version() function; graph creation success is sufficient proof
SELECT 'AGE extension loaded and engenox_kg graph created' AS status;