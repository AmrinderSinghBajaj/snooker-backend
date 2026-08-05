import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import MembershipSlab from '../models/MembershipSlab.js';
import Customer from '../models/Customer.js';

const router = Router();
router.use(requireAuth);

// GET all slabs
router.get('/slabs', async (req, res, next) => {
  try {
    const slabs = await MembershipSlab.find({ clubId: req.admin.clubId });
    res.json(slabs);
  } catch (err) {
    next(err);
  }
});

// POST create slab
router.post('/slabs', async (req, res, next) => {
  try {
    const { name, discountPercentage, appliesTo, description } = req.body;
    if (!name || discountPercentage === undefined) {
      return res.status(400).json({ detail: 'Name and discount percentage are required' });
    }
    const slab = await MembershipSlab.create({
      clubId: req.admin.clubId,
      name,
      discountPercentage,
      appliesTo: appliesTo || 'table',
      description: description || ''
    });
    res.status(201).json(slab);
  } catch (err) {
    next(err);
  }
});

// PUT update slab
router.put('/slabs/:id', async (req, res, next) => {
  try {
    const { name, discountPercentage, appliesTo, description } = req.body;
    const slab = await MembershipSlab.findOneAndUpdate(
      { _id: req.params.id, clubId: req.admin.clubId },
      { name, discountPercentage, appliesTo, description },
      { new: true }
    );
    if (!slab) {
      return res.status(404).json({ detail: 'Slab not found' });
    }
    res.json(slab);
  } catch (err) {
    next(err);
  }
});

// DELETE slab
router.delete('/slabs/:id', async (req, res, next) => {
  try {
    const slab = await MembershipSlab.findOneAndDelete({ _id: req.params.id, clubId: req.admin.clubId });
    if (!slab) {
      return res.status(404).json({ detail: 'Slab not found' });
    }
    // Also remove from any assigned customers
    await Customer.updateMany({ membershipSlabId: req.params.id }, { membershipSlabId: null });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST assign customer
router.post('/assign', async (req, res, next) => {
  try {
    const { customerId, membershipSlabId } = req.body;
    if (!customerId) {
      return res.status(400).json({ detail: 'Customer ID is required' });
    }
    // If slab ID is provided, verify it exists for this club
    if (membershipSlabId) {
      const slab = await MembershipSlab.findOne({ _id: membershipSlabId, clubId: req.admin.clubId });
      if (!slab) {
        return res.status(400).json({ detail: 'Invalid membership slab' });
      }
    }
    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, clubId: req.admin.clubId },
      { membershipSlabId: membershipSlabId || null },
      { new: true }
    );
    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

export default router;
