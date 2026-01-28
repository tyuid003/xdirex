# xdirex Setup Script for Cloudflare
# PowerShell script สำหรับ setup โปรเจกต์ xdirex บน Cloudflare

Write-Host "Starting xdirex setup..." -ForegroundColor Cyan
Write-Host ""

# ========================
# 1. สร้าง KV Namespace
# ========================
Write-Host "Creating KV Namespace..." -ForegroundColor Yellow

wrangler kv namespace create "REDIRECT_KV"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create KV namespace" -ForegroundColor Red
    exit 1
}

wrangler kv namespace create "REDIRECT_KV" --preview
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create preview KV namespace" -ForegroundColor Red
    exit 1
}

Write-Host "KV Namespace created" -ForegroundColor Green
Write-Host "Please update wrangler.toml with the KV namespace IDs shown above" -ForegroundColor Yellow
Write-Host ""

# ========================
# 2. สร้าง D1 Database
# ========================
Write-Host "Creating D1 Database..." -ForegroundColor Yellow

wrangler d1 create xdirex_db
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create D1 database" -ForegroundColor Red
    exit 1
}

Write-Host "D1 Database created" -ForegroundColor Green
Write-Host "Please update wrangler.toml with the D1 database ID shown above" -ForegroundColor Yellow
Write-Host ""

# Pause to let user update wrangler.toml
Write-Host "Please update wrangler.toml now with:" -ForegroundColor Cyan
Write-Host "   1. KV namespace IDs (id and preview_id)" -ForegroundColor White
Write-Host "   2. D1 database ID (database_id)" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter when you've updated wrangler.toml..."

# ========================
# 3. Run D1 Schema
# ========================
Write-Host "Running D1 schema..." -ForegroundColor Yellow

wrangler d1 execute xdirex_db --file=./schema.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to execute schema" -ForegroundColor Red
    exit 1
}

Write-Host "Database schema created" -ForegroundColor Green
Write-Host ""

# ========================
# 4. Setup Secrets
# ========================
Write-Host "Setting up secrets..." -ForegroundColor Yellow

# Google Client ID
$CLIENT_ID = "47581322131-7fugi4878jogfnge25hmgeli4ol2geat.apps.googleusercontent.com"
Write-Host "Setting GOOGLE_CLIENT_ID: $CLIENT_ID"
Write-Output $CLIENT_ID | wrangler secret put GOOGLE_CLIENT_ID

# Google Client Secret
$CLIENT_SECRET = "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"
Write-Host "Setting GOOGLE_CLIENT_SECRET: (hidden)"
Write-Output $CLIENT_SECRET | wrangler secret put GOOGLE_CLIENT_SECRET

# JWT Secret (generate random)
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "Setting JWT_SECRET: (auto-generated)"
Write-Output $JWT_SECRET | wrangler secret put JWT_SECRET

Write-Host "Secrets configured" -ForegroundColor Green
Write-Host ""

# ========================
# 5. Deploy Worker
# ========================
Write-Host "Deploying Worker..." -ForegroundColor Yellow

wrangler deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy Worker" -ForegroundColor Red
    exit 1
}

Write-Host "Worker deployed" -ForegroundColor Green
Write-Host ""

# ========================
# 6. Deploy Pages
# ========================
Write-Host "Deploying Pages..." -ForegroundColor Yellow

wrangler pages deploy public --project-name=xdirex
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy Pages" -ForegroundColor Red
    exit 1
}

Write-Host "Pages deployed" -ForegroundColor Green
Write-Host ""

# ========================
# 7. Final Instructions
# ========================
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Go to Cloudflare Dashboard > Pages > xdirex" -ForegroundColor White
Write-Host "   2. Settings > Functions > Service Bindings" -ForegroundColor White
Write-Host "   3. Add binding: Name=ASSETS, Service=xdirex (your worker)" -ForegroundColor White
Write-Host ""
Write-Host "   4. Go to Google Cloud Console:" -ForegroundColor White
Write-Host "      Update Authorized redirect URIs with your Pages URL:" -ForegroundColor White
Write-Host "      https://xdirex.pages.dev/api/auth/callback" -ForegroundColor White
Write-Host ""
Write-Host "Your app should be available at:" -ForegroundColor Cyan
Write-Host "   https://xdirex.pages.dev" -ForegroundColor White
Write-Host ""
