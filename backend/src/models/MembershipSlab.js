import mongoose from 'mongoose';

const membershipSlabSchema = new mongoose.Schema({
  clubId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  name:               { type: String, required: true },
  discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  appliesTo:          { type: String, enum: ['table', 'food', 'both'], default: 'table' },
  description:        { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('MembershipSlab', membershipSlabSchema);
