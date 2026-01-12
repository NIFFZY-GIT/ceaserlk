-- Migration: Add google_id column to users table for Google OAuth support
-- Run this migration to enable Google authentication

-- Add google_id column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Make password_hash nullable (Google users don't have passwords)
ALTER TABLE public.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Create index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id) WHERE google_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.users.google_id IS 'Google OAuth user ID (sub claim from Google)';
