# xdirex - Smart Redirect System

> **Cloudflare-first Smart Redirect System with Admin Dashboard**  
> เน้นความเร็วสูง, ฟรี, รองรับ redirect จำนวนมาก พร้อม Conversion Tracking

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/xdirex)

## ✨ Features

- 🚀 **ความเร็วสูง** - Cloudflare Edge Network
- 🆓 **ใช้งานฟรี** - Cloudflare Free Tier
- 🔗 **Multi-Link Management** - จัดการลิ้งก์หลักได้หลายอัน
- 🎯 **Smart Redirect** - Round-robin และ Random mode
- 📊 **Conversion Tracking** - ติดตาม conversion แบบ real-time
- 🎨 **Icon Customization** - เลือกไอคอนได้ 8 แบบ
- 🔐 **Google OAuth** - ล็อกอินด้วย Google
- 💾 **Cloudflare D1** - SQLite database
- ⚡ **Cloudflare KV** - Ultra-fast caching

## 🏗️ Tech Stack

- **Frontend**: HTML + Vanilla JavaScript + CSS
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Auth**: Google OAuth 2.0 + JWT
- **Hosting**: Cloudflare Pages

## 📦 Project Structure

```
xdirex/
├── public/                 # Frontend files
│   ├── index.html         # Main dashboard
│   ├── login.html         # Login page
│   └── assets/
│       ├── app.js         # Main application logic
│       ├── api.js         # API client
│       ├── auth.js        # Auth helpers
│       ├── style.css      # Styles
│       └── favicon_io/    # Favicons
├── worker/                # Cloudflare Workers
│   ├── index.js          # Main routing
│   ├── auth.js           # OAuth & JWT
│   ├── redirect.js       # Redirect logic
│   ├── conversion.js     # Conversion tracking
│   └── utils.js          # Utilities
├── migrations/           # D1 migrations
├── schema.sql           # Database schema
├── wrangler.toml        # Cloudflare config
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [Google OAuth Credentials](https://console.cloud.google.com/)

### Installation

1. **Clone repository**
```bash
git clone https://github.com/YOUR_USERNAME/xdirex.git
cd xdirex
```

2. **Install Wrangler**
```bash
npm install -g wrangler
wrangler login
```

3. **Create D1 Database**
```bash
wrangler d1 create xdirex_db
```
Copy the database ID to `wrangler.toml`

4. **Create KV Namespace**
```bash
wrangler kv:namespace create REDIRECT_KV
```
Copy the ID to `wrangler.toml`

5. **Run Migrations**
```bash
wrangler d1 execute xdirex_db --remote --file=schema.sql
wrangler d1 execute xdirex_db --remote --file=migrations/001_add_max_links_and_branding.sql
wrangler d1 execute xdirex_db --remote --file=migrations/002_change_default_mode.sql
wrangler d1 execute xdirex_db --remote --file=migrations/003_fix_main_link_slug_unique.sql
wrangler d1 execute xdirex_db --remote --file=migrations/004_add_contact_url.sql
```

6. **Set up Google OAuth**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create OAuth 2.0 credentials
- Add authorized redirect URI: `https://YOUR_DOMAIN/api/auth/callback`
- Copy Client ID and Client Secret

7. **Set Secrets**
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

8. **Deploy**
```bash
wrangler pages deploy public --project-name=xdirex
```

## 📖 Usage

### Creating Main Link

1. Login with Google
2. Click "สร้าง Main Link"
3. Enter slug (e.g., `my-campaign`)
4. Choose icon
5. Click "สร้าง"

### Adding Destinations

1. Click "Destinations" button on main link card
2. Click "เพิ่ม Destination"
3. Enter slug and URL
4. Click "เพิ่ม"

### Setting up Conversion Tracking

1. Click ⚙️ icon on destination link
2. Enter:
   - **Key name**: Field name (e.g., `status`)
   - **Success value**: Success value (e.g., `success`)
3. On your landing page, send POST request:

```javascript
fetch('https://your-domain.com/api/conversion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slug: 'campaign-a',
    data: { status: 'success' }
  })
});
```

## 🔧 Configuration

### wrangler.toml

```toml
name = "xdirex"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "xdirex_db"
database_id = "YOUR_DATABASE_ID"

[[kv_namespaces]]
binding = "REDIRECT_KV"
id = "YOUR_KV_ID"
```

### Environment Variables

- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `JWT_SECRET` - JWT signing secret

## 📊 Database Schema

### Tables

- **users** - User accounts with max_links limit
- **main_links** - Main redirect links
- **destination_links** - Destination URLs
- **conversion_settings** - Conversion tracking settings
- **round_robin_state** - Round-robin state
- **branding** - Footer branding

## 🎯 Redirect Modes

### Round-robin
Rotates through destinations sequentially

### Random
Randomly selects destination each time

## 🔗 API Endpoints

### Authentication
- `GET /api/auth/login` - Google OAuth login
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Main Links
- `GET /api/main-links` - Get all main links
- `POST /api/main-links` - Create main link
- `PUT /api/main-links/:id` - Update main link
- `DELETE /api/main-links/:id` - Delete main link

### Destinations
- `GET /api/destinations/:mainLinkId` - Get destinations
- `POST /api/destinations` - Create destination
- `PUT /api/destinations/:id` - Update destination
- `DELETE /api/destinations/:id` - Delete destination

### Conversion
- `POST /api/conversion` - Track conversion
- `POST /api/conversion/settings` - Set conversion settings

### Redirect
- `GET /:userSlug?go=:mainSlug` - Smart redirect

## 🎨 Customization

### Icons
8 Lucide icons available:
- link, zap, target, star, heart, gift, shopping-cart, trophy

### Branding
Update branding in D1 database:
```sql
UPDATE branding 
SET label = 'Your Brand', 
    url = 'https://your-site.com',
    contact_url = 'https://your-contact.com'
WHERE id = 1;
```

## 🐛 Troubleshooting

### OAuth not working
- Check redirect URIs in Google Cloud Console
- Verify CLIENT_ID and CLIENT_SECRET
- Check cookie domain settings

### Database errors
- Run all migrations in order
- Check D1 database binding in wrangler.toml

### KV not updating
- Check KV namespace binding
- Clear KV cache if needed

## 📝 License

MIT License - feel free to use for personal or commercial projects

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Contact

- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/xdirex/issues)

## 🙏 Acknowledgments

- Cloudflare Workers/Pages for infrastructure
- Google OAuth for authentication
- Lucide icons for UI icons

---

**Built with ❤️ using Cloudflare Stack**
