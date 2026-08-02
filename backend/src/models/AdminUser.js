import mongoose from 'mongoose';

const permissionActionSchema = new mongoose.Schema({
  view:   { type: Boolean, default: false },
  edit:   { type: Boolean, default: false },
  delete: { type: Boolean, default: false }
}, { _id: false });

const permissionViewOnlySchema = new mongoose.Schema({
  view:   { type: Boolean, default: false }
}, { _id: false });

const permissionEditSchema = new mongoose.Schema({
  view:   { type: Boolean, default: false },
  edit:   { type: Boolean, default: false }
}, { _id: false });

const adminUserSchema = new mongoose.Schema({
  username:       { type: String, required: true, unique: true, index: true },
  hashedPassword: { type: String, required: true },
  fullName:       { type: String, required: true, default: 'Club Owner' },
  clubId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: false, index: true },
  role:           { type: String, required: true, default: 'Club Owner' },
  plainPassword:  { type: String, default: '' },
  permissions: {
    dashboard:   { type: permissionViewOnlySchema, default: () => ({}) },
    customers:   { type: permissionActionSchema, default: () => ({}) },
    billing:     { type: permissionActionSchema, default: () => ({}) },
    tables:      { type: permissionActionSchema, default: () => ({}) },
    foodDrink:   { type: permissionActionSchema, default: () => ({}) },
    advancePay:  { type: permissionActionSchema, default: () => ({}) },
    revenue:     { type: permissionViewOnlySchema, default: () => ({}) },
    settings:    { type: permissionEditSchema, default: () => ({}) }
  }
}, { timestamps: true });

export default mongoose.model('AdminUser', adminUserSchema);
