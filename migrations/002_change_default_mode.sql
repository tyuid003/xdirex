-- Migration: Change default mode to round-robin

-- SQLite doesn't support ALTER COLUMN DEFAULT, so we'll update existing records
UPDATE main_links SET mode = 'round-robin' WHERE mode = 'random';
