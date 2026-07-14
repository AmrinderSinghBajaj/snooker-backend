import { getEffectiveElapsedMs } from './time.js';

/**
 * These helpers centralise the "shape" of every JSON response so all routes
 * emit identical field names and types to what the Python/FastAPI backend
 * produced.  Keeping this in one place means if a shape ever needs a tweak
 * you change it once here rather than hunting across every route file.
 *
 * Key rule: all IDs are emitted as *strings* (Mongo ObjectId.toString()).
 * The frontend compares them with === in places like:
 *   activeSessions.find((s) => s.asset_id === assetId)
 * so consistency (always string on both sides) is what matters.
 */

export function serializeAsset(a) {
  return {
    id:          a._id.toString(),
    category:    a.category,
    label:       a.label,
    hourly_rate: a.hourlyRate,
    image_url:   a.imageUrl ?? null,
    status:      a.status,
  };
}

export function serializeActiveSession(session, asset) {
  return {
    session_id:   session._id.toString(),
    serial_number: session.serialNumber,
    asset_id:     asset._id.toString(),
    asset_label:  asset.label,
    category:     asset.category,
    start_time:   session.startTime,
    hourly_rate:  asset.hourlyRate,
    player_names: session.players.map((p) => p.displayName),
    status:       session.status,
    elapsed_ms:   getEffectiveElapsedMs(session),
    paused_at:    session.pausedAt ?? null,
    paused_duration_ms: session.pausedDurationMs ?? 0,
  };
}

export function serializeBillingRecord(session, assetLabel) {
  let payers = session.players.filter((p) => p.isPayer);
  if (payers.length === 0) {
    payers = session.players;
  }
  const names    = payers.map((p) => p.displayName);
  const minutes  = (session.startTime && session.stopTime)
    ? Math.round((new Date(session.stopTime) - new Date(session.startTime)) / 60000 * 100) / 100
    : 0;
  const label = assetLabel
    || session.assetLabelOverride
    || 'Manual Entry';

  return {
    session_id:          session._id.toString(),
    serial_number:       session.serialNumber,
    player_names:        names,
    time_played_minutes: minutes,
    food_amount:         session.foodAmount ?? 0,
    total_amount:        session.totalAmount ?? 0,
    payment_status:      session.paymentStatus ?? null,
    payment_method:      session.paymentMethod ?? null,
    paid_amount:         session.paidAmount ?? 0,
    pending_amount:      session.pendingAmount ?? 0,
    start_time:          session.startTime ?? null,
    stop_time:           session.stopTime ?? null,
    asset_label:         label,
    is_manual_entry:     session.isManualEntry ?? false,
    was_edited:          session.wasEdited ?? false,
  };
}

export function serializeSessionDetail(session, assetLabel) {
  let payers = session.players.filter((p) => p.isPayer);
  if (payers.length === 0) {
    payers = session.players;
  }
  const names   = payers.map((p) => p.displayName);
  const minutes = (session.startTime && session.stopTime)
    ? Math.round((new Date(session.stopTime) - new Date(session.startTime)) / 60000 * 100) / 100
    : 0;
  const label = assetLabel || session.assetLabelOverride || 'Manual Entry';

  const foodLines = session.foodOrders.map((line) => ({
    name:       line.name,
    quantity:   line.quantity,
    unit_price: line.unitPrice,
    line_total: Math.round(line.unitPrice * line.quantity * 100) / 100,
    ordered_by: line.orderedBy || null,
  }));

  return {
    session_id:     session._id.toString(),
    serial_number:  session.serialNumber,
    asset_label:    label,
    player_names:   names,
    start_time:     session.startTime ?? null,
    stop_time:      session.stopTime ?? null,
    minutes_played: minutes,
    time_amount:    session.timeAmount ?? 0,
    food_amount:    session.foodAmount ?? 0,
    total_amount:   session.totalAmount ?? 0,
    food_lines:     foodLines,
    payment_status: session.paymentStatus ?? null,
    payment_method: session.paymentMethod ?? null,
    paid_amount:    session.paidAmount ?? 0,
    pending_amount: session.pendingAmount ?? 0,
  };
}

export function serializeCustomer(c) {
  return {
    id:           c._id.toString(),
    username:     c.username,
    display_name: c.displayName,
    created_at:   c.createdAt,
  };
}

export function serializeFoodItem(f) {
  return {
    id:        f._id.toString(),
    name:      f.name,
    price:     f.price,
    image_url: f.imageUrl ?? null,
  };
}
