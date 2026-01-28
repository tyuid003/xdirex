# Setup Complete Summary - xdirex

## ✅ สิ่งที่สร้างสำเร็จแล้ว:

### 1. Cloudflare KV Namespace
- **REDIRECT_KV**: `3ba1825cd9574423b301df48851a5548`
- **Preview**: `d9c5205b12c443dcb34e7121a29aca31`

### 2. Cloudflare D1 Database
- **xdirex_db**: `e019f123-42a1-48f6-aab5-a904051eada5`
- Schema deployed ✅

### 3. Secrets Configured
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ JWT_SECRET (auto-generated)

### 4. Worker Deployed
- 🔗 **Worker URL**: https://xdirex.tyuid003.workers.dev
- ✅ Version: b3753a0f-e4c4-471b-ad4e-5fe679529bef

### 5. Pages Deployed
- 🔗 **Pages URL**: https://239394ac.xdirex.pages.dev
- ✅ Project name: xdirex

---

## 🔧 ขั้นตอนสุดท้าย (ทำใน Cloudflare Dashboard):

### 1. Bind KV และ D1 เข้ากับ Pages

1. ไปที่: https://dash.cloudflare.com/
2. เลือก **Pages** → **xdirex**
3. ไปที่ **Settings** → **Functions**
4. ใน section **KV namespace bindings** คลิก **Add binding**:
   - **Variable name**: `REDIRECT_KV`
   - **KV namespace**: เลือก `REDIRECT_KV` (3ba1825cd9574423b301df48851a5548)
   - คลิก **Save**

5. ใน section **D1 database bindings** คลิก **Add binding**:
   - **Variable name**: `DB`
   - **D1 database**: เลือก `xdirex_db`
   - คลิก **Save**

6. ใน section **Environment variables** คลิก **Add variable** (3 ครั้ง):
   - **GOOGLE_CLIENT_ID**: `47581322131-7fugi4878jogfnge25hmgeli4ol2geat.apps.googleusercontent.com`
   - **GOOGLE_CLIENT_SECRET**: `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`
   - **JWT_SECRET**: (ใช้ค่าที่ gen ไว้ หรือสร้างใหม่)

### 2. Update Google OAuth Redirect URI

1. ไปที่ **Google Cloud Console**: https://console.cloud.google.com/
2. เลือกโปรเจกต์ **xdirex**
3. ไปที่ **APIs & Services** → **Credentials**
4. คลิกที่ OAuth 2.0 Client ID ของคุณ
5. ใน **Authorized redirect URIs** เพิ่ม:
   ```
   https://239394ac.xdirex.pages.dev/api/auth/callback
   ```
   (หรือใช้ custom domain ถ้ามี)
6. คลิก **Save**

---

## 🚀 ทดสอบระบบ:

1. เข้า **Pages URL**: https://239394ac.xdirex.pages.dev
2. คลิก **Login with Google**
3. หลัง login สำเร็จ คุณจะเห็น Dashboard
4. สร้าง **Main Link** แรกของคุณ!

---

## 📝 หมายเหตุ:

- **Worker URL** ใช้สำหรับ redirect เท่านั้น (optional)
- **Pages URL** คือ URL หลักที่ใช้งานจริง
- ถ้าต้องการใช้ **Custom Domain** ให้ตั้งค่าใน Pages Settings → Custom domains

---

## 🎯 ตัวอย่างการใช้งาน:

หลังจาก login และสร้าง main link (เช่น `mycampaign`) และเพิ่ม destination links:

**Redirect URL**:
```
https://239394ac.xdirex.pages.dev/{your_user_slug}?go=mycampaign
```

ระบบจะ redirect ไปยัง destination link ที่เลือกแบบ random หรือ round-robin!

---

**🎉 ขอบคุณที่ใช้ xdirex!**
