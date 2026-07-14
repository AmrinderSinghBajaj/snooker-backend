import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  clubId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  username:    { type: String, required: true, index: true },
  displayName: { type: String, required: true },
}, { timestamps: true });

// Enforce unique usernames scoped within each club
customerSchema.index({ clubId: 1, username: 1 }, { unique: true });

export default mongoose.model('Customer', customerSchema);
