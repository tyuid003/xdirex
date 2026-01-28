-- Migration: Add max_links to users table and branding table

-- Add max_links column to users table (default 1 สำหรับ free tier)
ALTER TABLE users ADD COLUMN max_links INTEGER DEFAULT 1;

-- Branding Table (สำหรับเก็บ footer link)
CREATE TABLE IF NOT EXISTS branding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default branding
INSERT INTO branding (label, url) VALUES ('Powered by Taekabu', 'https://google.com');
