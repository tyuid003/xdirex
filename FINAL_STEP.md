# ขั้นตอนสุดท้าย - Bind KV และ D1 กับ Pages

## ✅ สิ่งที่ทำเรียบร้อยแล้ว:
- ✅ Secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET)

## 🔧 ทำขั้นตอนนี้ใน Cloudflare Dashboard (ใช้เวลา 1 นาที):

### 1. เปิด Cloudflare Dashboard
URL: https://dash.cloudflare.com/

### 2. ไปที่ Pages Project
1. คลิก **Workers & Pages** (เมนูซ้าย)
2. คลิกที่ **xdirex** (Pages project)

### 3. ตั้งค่า Bindings
1. คลิกแท็บ **Settings**
2. เลื่อนลงไปที่ **Functions**
3. ทำ 2 สิ่งนี้:

#### A. KV Namespace Binding
- ใน section **KV namespace bindings** คลิก **Edit variables**
- คลิก **Add binding**
- กรอก:
  - **Variable name**: `REDIRECT_KV`
  - **KV namespace**: เลือก `REDIRECT_KV` (3ba1825cd9574423b301df48851a5548)
- คลิก **Save**

#### B. D1 Database Binding
- ใน section **D1 database bindings** คลิก **Edit variables**  
- คลิก **Add binding**
- กรอก:
  - **Variable name**: `DB`
  - **D1 database**: เลือก `xdirex_db`
- คลิก **Save**

---

## 🌐 หลังจากนั้น...

เข้าใช้งานได้ที่: **https://xdirex.pages.dev**

---

## 🔐 อย่าลืม! Update Google OAuth Redirect URI

1. ไปที่ https://console.cloud.google.com/
2. เลือก project **xdirex**
3. ไปที่ **APIs & Services** → **Credentials**
4. คลิก OAuth 2.0 Client ID ของคุณ
5. เพิ่ม **Authorized redirect URIs**:
   ```
   https://xdirex.pages.dev/api/auth/callback
   ```
6. คลิก **Save**

---

## 🎉 เสร็จแล้ว!

ระบบพร้อมใช้งาน 100%
