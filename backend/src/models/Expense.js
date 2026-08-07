import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  clubId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  amount:      { type: Number, required: true, min: 0.01 },
  category:    { type: String, default: 'Other', trim: true },
  note:        { type: String, default: '', trim: true },
  date:        { type: Date, default: Date.now, index: true },
  createdBy:   { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
