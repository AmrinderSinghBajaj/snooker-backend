import mongoose from 'mongoose';

const foodOrderLineSchema = new mongoose.Schema({
  foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
  name:       { type: String, required: true },   // snapshot at time of order
  quantity:   { type: Number, required: true, default: 1 },
  unitPrice:  { type: Number, required: true },
  orderedBy:  { type: String, default: null },
}, { _id: false });

const playerSchema = new mongoose.Schema({
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  displayName: { type: String, required: true },
  isPayer:     { type: Boolean, default: false },
  shareAmount: { type: Number, default: null },
}, { _id: false });

const gameSessionSchema = new mongoose.Schema({
  clubId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  serialNumber:        { type: Number, required: true, index: true },
  assetId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
  assetLabelOverride:  { type: String, default: null }, // used when assetId is null (manual entry)

  startTime:   { type: Date, default: null },
  stopTime:    { type: Date, default: null },
  finalizedAt: { type: Date, default: null },
  pausedAt:    { type: Date, default: null },
  pausedDurationMs: { type: Number, default: 0 },

  // running -> paused -> stopped -> billed -> payment set
  status:        { type: String, default: 'running' },
  timeAmount:    { type: Number, default: null },
  foodAmount:    { type: Number, default: 0 },
  totalAmount:   { type: Number, default: null },
  paidAmount:    { type: Number, default: 0 },
  pendingAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: null }, // 'paid' | 'unpaid' | null
  paymentMethod:     { type: String, enum: ['online', 'offline', 'wallet', 'split', null], default: null },
  walletPaidAmount:  { type: Number, default: 0 },
  onlinePaidAmount:  { type: Number, default: 0 },
  offlinePaidAmount: { type: Number, default: 0 },

  players:    [playerSchema],
  foodOrders: [foodOrderLineSchema],

  isManualEntry: { type: Boolean, default: false },
  wasEdited:     { type: Boolean, default: false },
  lastEditedAt:  { type: Date, default: null },

  preStoppedStatus:   { type: String, default: null },
  preStoppedPausedAt: { type: Date, default: null },
}, { timestamps: true });

// Enforce unique serial numbers scoped per club
gameSessionSchema.index({ clubId: 1, serialNumber: 1 }, { unique: true });

// Virtual: safe display label regardless of whether this is a real or manual session
gameSessionSchema.virtual('displayLabel').get(function () {
  if (this.assetLabelOverride) return this.assetLabelOverride;
  return 'Manual Entry';
});

export default mongoose.model('GameSession', gameSessionSchema);
