# The Billiards Arena — Admin Panel

Full implementation of the FRD: login, Table & PlayStation setup, live game
timers, billing (split billing, paid/unpaid, edit, manual entry), food &
drink ordering, and revenue analytics with donut-chart drilldowns.

## Architecture

```
billiards-arena/
├── backend/               Node.js (Express) + MongoDB — all business logic
│   ├── src/
│   │   ├── models/        Mongoose schemas (AdminUser, Asset, GameSession, etc.)
│   │   ├── routes/        Express routers (identical URL/JSON contract to prior Python build)
│   │   ├── middleware/    JWT auth middleware
│   │   ├── utils/         Security, serializers, customer helper, serial number
│   │   ├── clubConfig.js  WHITE-LABEL CONFIG — only file to edit per new client
│   │   └── server.js      Entry point
│   ├── static/            Drop logo.png here
│   ├── seedAdmin.js       Creates first Club Owner login (run once after deploy)
│   └── Dockerfile
├── frontend/              React (Vite) — Admin Panel UI, hosted on Firebase
│                          ← UI UNCHANGED from original build
└── backend-python-legacy/ Original Python/FastAPI build (kept for reference)
```

**Firebase Hosting only serves static files.** The split is:
- **Frontend** → Firebase Hosting (free, fast)
- **Backend** → Render (easiest, free tier) or Railway or AWS — anywhere
  Node.js runs. Instructions below cover Render.
- **Database** → MongoDB Atlas (free tier M0, cloud-hosted)

---

## 1. MongoDB Atlas setup (do this first)

1. Go to https://cloud.mongodb.com and create a free account.

2. Create a free **M0 cluster** (any region close to your backend host).
3. Under **Database Access** → Add a database user with a strong password.
4. Under **Network Access** → Add IP address → `0.0.0.0/0` (allow anywhere)
   or your specific server IP.
5. Under **Database** → **Connect** → **Drivers** → Node.js → copy the
   connection string. It looks like:
   `mongodb+srv://youruser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Add the database name before the `?`:
   `mongodb+srv://youruser:<password>@cluster0.xxxxx.mongodb.net/billiards_arena?retryWrites=true&w=majority`
7. Save this string — it goes into `MONGODB_URI` in your backend environment.

---

## 2. Backend setup

### Local testing

```bash
cd backend
npm install
cp .env.example .env
# Edit .env:
#   MONGODB_URI=<your Atlas connection string from step 6 above>
#   SECRET_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
#   ALLOWED_ORIGINS=http://localhost:5173

npm run seed     # creates the first Club Owner login (from src/clubConfig.js)
npm run dev      # starts the server with --watch on http://localhost:8000
```

Visit `http://localhost:8000/health` to confirm it's running.

### Deploy to Render (recommended — free, simplest)

1. Push the `backend/` folder to a GitHub repo.
2. On https://render.com → **New → Web Service** → connect your repo →
   root directory `backend`.
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `node src/server.js`
3. Add environment variables (Render dashboard → Environment):
   - `MONGODB_URI` = your Atlas connection string
   - `SECRET_KEY`  = a long random hex string
   - `ALLOWED_ORIGINS` = `https://your-project.web.app` (your Firebase URL)
4. Deploy. Render gives you a URL like `https://billiards-arena-api.onrender.com`.
5. Open Render's **Shell** tab and run: `node seedAdmin.js`

### Deploy to Railway

1. New project → Deploy from GitHub repo → root directory `backend`.
2. Add the same environment variables.
3. Railway auto-detects Node and runs `npm start`.
4. Run `node seedAdmin.js` from Railway's shell after first deploy.

### Deploy to AWS (matches the FRD's AWS mention)

Use the included `Dockerfile`:
1. Push image to **ECR**, run on **ECS Fargate** or **EC2**.
2. Use **MongoDB Atlas** for the database (or MongoDB on DocumentDB if you
   prefer a fully AWS-managed option).
3. Pass `MONGODB_URI`, `SECRET_KEY`, `ALLOWED_ORIGINS` as task environment
   variables.

---

## 3. Frontend setup & Firebase Hosting deploy

### Local testing

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_BASE_URL=http://localhost:8000
npm run dev      # http://localhost:5173
```

### First-time Firebase setup

```bash
npm install -g firebase-tools
firebase login
```

Don't have a Firebase project yet?
1. Go to https://console.firebase.google.com
2. **Add project** → name it (e.g. "billiards-arena") → finish the wizard.
3. Copy the **Project ID** from Project Settings.
4. Edit `frontend/.firebaserc` → replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`.

### Deploy

```bash
cd frontend
echo "VITE_API_BASE_URL=https://your-backend-url.onrender.com" > .env
npm run build
firebase deploy --only hosting
```

**Important:** add the Firebase URL to your backend's `ALLOWED_ORIGINS`
environment variable — otherwise the browser will block all API requests (CORS).

---

## 4. First login

After both are deployed:
- Visit your Firebase URL
- Wait for the 2-second club name animation
- Sign in with the username/password from `backend/src/clubConfig.js`
  (default: `beerbalji` / `ChangeMe123!` — **change before going live**)

---

## White-label setup (selling to multiple clubs)

Everything club-specific lives in **one file**: `backend/src/clubConfig.js`

```js
export const CLUB_NAME       = 'The Billiards Arena';
export const OWNER_FULL_NAME = 'Beerbal Ji';
export const OWNER_USERNAME  = 'beerbalji';
export const OWNER_PASSWORD  = 'ChangeMe123!';
```

To onboard a new club:
1. Edit the four values above.
2. Replace `backend/static/logo.png` with their logo (square PNG,
   transparent background, ≥256×256px). Same filename — nothing else changes.
3. Redeploy the backend.
4. Run `node seedAdmin.js` once to create that owner's login.
5. Point the same unchanged frontend build at this backend's URL.

Each club gets its own backend deployment + Atlas cluster for full data
separation. The frontend is generic — it reads club name and logo live from
`GET /branding` which just returns what `clubConfig.js` says.

---

## What's implemented (mapped to your FRD)

| FRD Section | Status |
|---|---|
| B.1 Login (2s animation + username/password) | ✅ |
| B.2 Table & PlayStation Setup | ✅ |
| B.3 Starting a Game (player names, live timer, customer log) | ✅ |
| B.4 Billing & Payments (stop, split, Done, Paid/Unpaid, Edit, Manual entry) | ✅ |
| B.5 Revenue Section (Today/Week/Month donuts, drilldowns, date search/range) | ✅ |
| B.6 Food & Drink (menu setup, cart, assign to active player) | ✅ |
| B.7 Final Checkout (See Detail) | ✅ |
| Tournament Section | Nav shows "Soon" — future feature per FRD |

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Recharts |
| Frontend hosting | Firebase Hosting |
| Backend | Node.js 20 + Express 4 |
| Database | MongoDB Atlas (Mongoose 8) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Backend hosting | Render / Railway / AWS ECS |

## Notes before going live

- **Change the default password** in `clubConfig.js` before onboarding any real client.
- Render's free tier sleeps after 15 minutes of inactivity — the first
  request after sleep takes ~30s. Fine for a single-club tool; upgrade to a
  paid tier for always-on.
- The free MongoDB Atlas M0 tier has a 512MB storage limit — plenty for
  years of billing records for a single club, but keep it in mind as you scale.
- No automated tests are included. Test the start→stop→split→done→paid flow
  end-to-end in a staging environment before using at the counter.
