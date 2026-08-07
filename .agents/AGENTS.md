# Billiards Arena - Project Rules

## 🚀 Deployment Config ("push live" / "deploy" / "go live")

Whenever the user says to push changes live, deploy, or anything similar, follow this exact process **without asking**:

### Server Details
- **Domain**: bajajsnookerarena.shop
- **Server IP**: 43.205.129.213
- **SSH User**: ubuntu
- **SSH Key**: `D:\amii\snooker-key.pem`
- **Project dir on server**: `~/snooker-backend`
- **Process manager**: PM2, app name: `snooker-backend`

### Frontend Details
- **Framework**: React + Vite
- **Hosting**: Vercel — **auto-deploys on every `git push` to `main`**
- **Frontend dir**: `d:\billiards-arena\frontend`
- **Production env**: `.env.production` → `VITE_API_BASE_URL=/api`
- **API proxy**: `vercel.json` rewrites `/api/*` → `http://43.205.129.213:5000/*`

### Full Deployment Steps (run in this order)

#### 1. Git — commit & push any uncommitted changes
```powershell
# In d:\billiards-arena
git add -A
git commit -m "deploy: <describe changes>"
git push origin main
```
> This also triggers the Vercel frontend deploy automatically. Skip if working tree is already clean.

#### 2. Backend — SSH pull & restart
```powershell
ssh -i "D:\amii\snooker-key.pem" -o StrictHostKeyChecking=no ubuntu@43.205.129.213 `
  "cd ~/snooker-backend && git pull origin main && cd backend && npm install --production && pm2 restart snooker-backend"
```

### Notes
- **Frontend deploys automatically** via Vercel on every `git push` to `main` — no manual step needed
- Always run backend deploy AFTER git push
- PM2 process name is exactly `snooker-backend`
- No password needed — key-based SSH only
