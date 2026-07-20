import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  clubId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  type:         { type: String, enum: ['credit', 'debit'], required: true },
  amount:       { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description:  { type: String, default: '' },
  sessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'GameSession', default: null },
  paymentMethod:{ type: String, enum: ['online', 'offline', 'wallet', 'split', null], default: null },
}, { timestamps: true });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
