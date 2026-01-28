-- Migration: Add contact_url to branding table
-- เพิ่มฟิลด์ contact_url สำหรับลิ้งก์ติดต่อในกรณีครบ limit

-- เพิ่ม column contact_url
ALTER TABLE branding ADD COLUMN contact_url TEXT DEFAULT 'https://facebook.com';

-- อัพเดทข้อมูลปัจจุบัน
UPDATE branding SET contact_url = 'https://facebook.com' WHERE id = 1;
