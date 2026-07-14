import mongoose from 'mongoose';

const CATEGORIES = ['Snooker', 'Pool', 'Heyball', 'PlayStation', 'Chess', 'Carrom'];
const STATUSES   = ['idle', 'active', 'stopped'];

const assetSchema = new mongoose.Schema({
  clubId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  category:   { type: String, enum: CATEGORIES, required: true },
  label:      { type: String, required: true },   // e.g. "Table 1", "PlayStation 2"
  hourlyRate: { type: Number, required: true },
  imageUrl:   { type: String, default: null },
  status:     { type: String, enum: STATUSES, default: 'idle' },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

export const ASSET_CATEGORIES = CATEGORIES;

export default mongoose.model('Asset', assetSchema);
