-- Migration 005: Remove UNIQUE constraint from destination_links.slug
-- Allow duplicate slugs across different destinations

-- SQLite ไม่รองรับ ALTER TABLE DROP CONSTRAINT โดยตรง
-- ต้องสร้างตารางใหม่แล้วย้ายข้อมูล

-- 1. สร้างตารางใหม่โดยไม่มี UNIQUE constraint
CREATE TABLE IF NOT EXISTS destination_links_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  main_link_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (main_link_id) REFERENCES main_links(id) ON DELETE CASCADE
);

-- 2. Copy ข้อมูลจากตารางเก่า
INSERT INTO destination_links_new (id, main_link_id, slug, url, is_active, created_at)
SELECT id, main_link_id, slug, url, is_active, created_at
FROM destination_links;

-- 3. ลบตารางเก่า
DROP TABLE destination_links;

-- 4. เปลี่ยนชื่อตารางใหม่
ALTER TABLE destination_links_new RENAME TO destination_links;

-- 5. สร้าง indexes ใหม่
CREATE INDEX idx_destination_main_link ON destination_links(main_link_id);
CREATE INDEX idx_destination_slug ON destination_links(slug);
