import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';

import authRouter      from './routes/auth.js';
import assetsRouter    from './routes/assets.js';
import billingRouter   from './routes/billing.js';
import foodRouter      from './routes/food.js';
import revenueRouter   from './routes/revenue.js';
import customersRouter from './routes/customers.js';
import brandingRouter  from './routes/branding.js';
import Club            from './models/Club.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 5000;
app.use('/static', express.static(path.join(__dirname, '../static'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,https://thebilliardarena.shop,http://thebilliardarena.shop,http://bajajsnooker.shop,https://bajajsnooker.shop')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: async (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps in dev)
    if (!origin) return callback(null, true);
    try {
      const parsed = new URL(origin);
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(origin + '/')
      ) {
        return callback(null, true);
      }

      // Check if it matches any registered club's customDomain or subdomain
      const cleanHost = hostname.replace(/^www\./i, '');
      const club = await Club.findOne({
        $or: [
          { customDomain: cleanHost },
          { subdomain: cleanHost }
        ]
      });
      if (club) {
        return callback(null, true);
      }
    } catch (e) {
      // fallback to allowedOrigins list match
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
// Route prefixes are identical to the Python FastAPI backend so the frontend
// doesn't need any changes at all.
app.use('/auth',      authRouter);
app.use('/assets',    assetsRouter);
app.use('/billing',   billingRouter);
app.use('/food',      foodRouter);
app.use('/revenue',   revenueRouter);
app.use('/customers', customersRouter);
app.use('/branding',  brandingRouter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'billiards-arena-api' }));

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ detail: err.message || 'Internal server error' });
});

// ── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Billiards Arena API running on port ${PORT}`);
    console.log(`Docs/health: http://localhost:${PORT}/health`);
  });
}

start();
