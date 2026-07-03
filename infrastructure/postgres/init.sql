-- Initial database setup script for InboxOS
-- Enable required extensions for UUID generation and crypto hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
