-- Migration: Add goal_image_url to user_profiles for gap-to-goal retention loop
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS goal_image_url TEXT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'goal_image_url';
