-- Migration: Fix main_links slug unique constraint
-- เปลี่ยนจาก UNIQUE(slug) เป็น UNIQUE(user_id, slug)
-- ให้ user คนละคนสามารถใช้ slug เดียวกันได้

-- SQLite ไม่รองรับ DROP CONSTRAINT โดยตรง ต้องสร้างตารางใหม่

-- 1. สร้างตารางใหม่ที่มี constraint ถูกต้อง
CREATE TABLE IF NOT EXISTS main_links_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'round-robin',
  icon TEXT DEFAULT 'link',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, slug)
);

-- 2. คัดลอกข้อมูลจากตารางเก่า
INSERT INTO main_links_new (id, user_id, slug, mode, icon, created_at)
SELECT id, user_id, slug, mode, icon, created_at FROM main_links;

-- 3. ลบตารางเก่า
DROP TABLE main_links;

-- 4. เปลี่ยนชื่อตารางใหม่
ALTER TABLE main_links_new RENAME TO main_links;

-- 5. สร้าง indexes ใหม่
CREATE INDEX idx_main_links_user ON main_links(user_id);
CREATE INDEX idx_main_links_slug ON main_links(slug);
