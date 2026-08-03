import mongoose from 'mongoose';

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 43200 // 12 hours (720 minutes) in seconds
  }
});

export default mongoose.model('BlacklistedToken', blacklistedTokenSchema);
