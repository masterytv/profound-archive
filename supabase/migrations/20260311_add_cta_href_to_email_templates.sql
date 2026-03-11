-- Migration: add cta_href column to email_templates
-- Run this in Supabase SQL Editor

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS cta_href text;

-- Default newsletter_welcome to the quiz page
UPDATE email_templates
SET cta_href = 'https://projectprofound.org/quiz'
WHERE archetype = 'newsletter_welcome' AND cta_href IS NULL;
