import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema({
  username:       { type: String, required: true, unique: true, index: true },
  hashedPassword: { type: String, required: true },
  fullName:       { type: String, required: true, default: 'Club Owner' },
  clubId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  role:           { type: String, required: true, default: 'Club Owner' },
}, { timestamps: true });

export default mongoose.model('AdminUser', adminUserSchema);
