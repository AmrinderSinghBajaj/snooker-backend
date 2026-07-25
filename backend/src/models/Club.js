import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  subdomain: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  ownerName: { type: String, required: true, default: 'Club Owner' },
  targetDaily: { type: Number, required: true, default: 2000 },
  themePrimary: { type: String, required: true, default: '#0b2b22' },
  themeSecondary: { type: String, required: true, default: '#c9a24b' },
  language: { type: String, required: true, default: 'en' },
  customDomain: { type: String, unique: true, sparse: true },
  logoUrl: { type: String, default: "" },
  faviconUrl: { type: String, default: "" },
  isActive: { type: Boolean, default: true, required: true },
  expiryDate: { type: Date, default: null },
  firstLoginAt: { type: Date, default: null },
  trialDurationDays: { type: Number, default: null }
}, { timestamps: true });

export default mongoose.model('Club', clubSchema);
