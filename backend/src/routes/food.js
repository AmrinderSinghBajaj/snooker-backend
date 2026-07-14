import { Router } from 'express';
import FoodItem from '../models/FoodItem.js';
import GameSession from '../models/GameSession.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeFoodItem } from '../utils/serializers.js';
import { nextSerialNumber } from '../utils/serial.js';

const router = Router();

/**
 * GET /food/items
 * Get food items for this club.
 */
router.get('/items', requireAuth, async (req, res) => {
  try {
    const items = await FoodItem.find({ clubId: req.admin.clubId, isArchived: false }).sort({ name: 1 });
    return res.json(items.map(serializeFoodItem));
  } catch (err) {
    console.error('GET /food/items', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /food/items
 * Create a new food item.
 */
router.post('/items', requireAuth, async (req, res) => {
  try {
    const { name, price, image_url } = req.body;
    if (!name?.trim()) return res.status(422).json({ detail: 'Name is required' });
    if (!price || Number(price) <= 0) return res.status(422).json({ detail: 'Price must be greater than 0' });

    const item = await FoodItem.create({
      clubId: req.admin.clubId,
      name: name.trim(),
      price: Number(price),
      imageUrl: image_url ?? null,
    });
    return res.status(201).json(serializeFoodItem(item));
  } catch (err) {
    console.error('POST /food/items', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * DELETE /food/items/:id
 * Soft-delete a food item.
 */
router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    const item = await FoodItem.findOne({ _id: req.params.id, clubId: req.admin.clubId });
    if (!item) return res.status(404).json({ detail: 'Item not found' });
    item.isArchived = true;
    await item.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /food/items/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /food/assign
 * Assign items to an active session or create a Walk-in Guest session.
 */
router.post('/assign', requireAuth, async (req, res) => {
  try {
    const { session_id, lines, ordered_by } = req.body;
    if (!session_id) return res.status(422).json({ detail: 'session_id is required' });
    if (!Array.isArray(lines) || lines.length === 0) return res.status(422).json({ detail: 'lines must be a non-empty array' });

    let addedTotal = 0;
    const foodOrders = [];

    // Process all lines first to validate food items and calculate total cost
    for (const cartLine of lines) {
      const item = await FoodItem.findOne({ _id: cartLine.food_item_id, clubId: req.admin.clubId });
      if (!item) return res.status(404).json({ detail: `Food item ${cartLine.food_item_id} not found` });

      const qty = Number(cartLine.quantity) || 1;
      foodOrders.push({
        foodItemId: item._id,
        name:       item.name,
        quantity:   qty,
        unitPrice:  item.price,
        orderedBy:  ordered_by || null,
      });
      addedTotal += item.price * qty;
    }

    if (session_id === 'other') {
      const serial = await nextSerialNumber(req.admin.clubId);
      const session = await GameSession.create({
        clubId:             req.admin.clubId,
        serialNumber:       serial,
        assetId:            null,
        assetLabelOverride: 'Walk-in / Bar',
        startTime:          new Date(),
        stopTime:           new Date(),
        finalizedAt:        new Date(),
        status:             'billed',
        timeAmount:         0,
        foodAmount:         addedTotal,
        totalAmount:        addedTotal,
        paymentStatus:      'unpaid',
        paidAmount:         0,
        pendingAmount:      addedTotal,
        players:            [{ displayName: ordered_by || 'Walk-in Guest' }],
        foodOrders:         foodOrders,
        isManualEntry:      true,
      });

      return res.json({
        order_id:            null,
        added_total:         Math.round(addedTotal * 100) / 100,
        session_food_amount: addedTotal,
      });
    }

    const session = await GameSession.findOne({ _id: session_id, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });
    if (!['running', 'paused'].includes(session.status)) {
      return res.status(400).json({ detail: 'Can only assign food to an active or paused session' });
    }

    // Append to existing food orders array
    for (const order of foodOrders) {
      session.foodOrders.push(order);
    }

    session.foodAmount = Math.round(((session.foodAmount ?? 0) + addedTotal) * 100) / 100;
    session.totalAmount = Math.round(((session.timeAmount ?? 0) + session.foodAmount) * 100) / 100;
    await session.save();

    return res.json({
      order_id:            null,
      added_total:         Math.round(addedTotal * 100) / 100,
      session_food_amount: session.foodAmount,
    });
  } catch (err) {
    console.error('POST /food/assign', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
