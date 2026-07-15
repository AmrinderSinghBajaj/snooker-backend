import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';

import authRouter      from './routes/auth.js';
import assetsRouter    from './routes/assets.js';
import billingRouter   from './routes/billing.js';
import foodRouter      from './routes/food.js';
import revenueRouter   from './routes/revenue.js';
import customersRouter from './routes/customers.js';
import brandingRouter  from './routes/branding.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,https://thebilliardarena.shop,http://thebilliardarena.shop')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps in dev)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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
