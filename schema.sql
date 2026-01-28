-- Cloudflare D1 Schema for Smart Redirect System
-- สร้างตารางสำหรับเก็บข้อมูล users, main links, destination links และ conversion settings

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  user_slug TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_slug ON users(user_slug);

-- Main Links Table (multiple main links per user based on max_links)
CREATE TABLE IF NOT EXISTS main_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'round-robin', -- 'random' or 'round-robin'
  icon TEXT DEFAULT 'link',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_main_links_user ON main_links(user_id);
CREATE INDEX idx_main_links_slug ON main_links(slug);

-- Destination Links Table
CREATE TABLE IF NOT EXISTS destination_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  main_link_id INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  is_active INTEGER DEFAULT 1, -- 1 = active, 0 = inactive
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (main_link_id) REFERENCES main_links(id) ON DELETE CASCADE
);

CREATE INDEX idx_destination_main_link ON destination_links(main_link_id);
CREATE INDEX idx_destination_slug ON destination_links(slug);

-- Conversion Settings Table
CREATE TABLE IF NOT EXISTS conversion_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_link_id INTEGER NOT NULL UNIQUE,
  key_name TEXT NOT NULL, -- e.g., "status"
  success_value TEXT NOT NULL, -- e.g., "success"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_link_id) REFERENCES destination_links(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversion_dest_link ON conversion_settings(destination_link_id);

-- Round-robin state (เก็บ index ของ link ที่ต้องใช้ครั้งถัดไป)
CREATE TABLE IF NOT EXISTS round_robin_state (
  main_link_id INTEGER PRIMARY KEY,
  last_index INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (main_link_id) REFERENCES main_links(id) ON DELETE CASCADE
);
