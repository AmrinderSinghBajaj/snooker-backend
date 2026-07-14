import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema({
  clubId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  name:       { type: String, required: true },
  price:      { type: Number, required: true },
  imageUrl:   { type: String, default: null },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('FoodItem', foodItemSchema);
