import { useState, useEffect } from 'react';
import { foodApi, assetsApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { getFoodEmoji } from '../utils/categoryAssets';
import Food3DModel, { getCategory } from '../components/Food3DModel';

/*
  FRD B.6 - Food & Drink Section:
    Product Setup: Add button -> image, name, price.
    Ordering & Assignment: build a cart, "Assign to Active User" links
    items to a player currently at a table; cost added to their bill.
*/
export default function FoodAndDrink() {
  const [items, setItems] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('billiards_food_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isWalkin, setIsWalkin] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!showAssignModal) {
      setSelectedPlayers([]);
      setIsWalkin(false);
      setGuestName('');
      setTargetSessionId('');
      setDropdownOpen(false);
    }
  }, [showAssignModal]);

  const handleTogglePlayer = (playerName, sessionId) => {
    setIsWalkin(false);
    if (targetSessionId && targetSessionId !== sessionId) {
      setTargetSessionId(sessionId);
      setSelectedPlayers([playerName]);
    } else {
      setTargetSessionId(sessionId);
      setSelectedPlayers(prev => {
        const next = prev.includes(playerName)
          ? prev.filter(name => name !== playerName)
          : [...prev, playerName];
        if (next.length === 0) setTargetSessionId('');
        return next;
      });
    }
  };

  const handleToggleWalkin = () => {
    setIsWalkin(true);
    setTargetSessionId('');
    setSelectedPlayers([]);
  };

  const getDropdownLabel = () => {
    if (isWalkin) {
      return guestName ? `Walk-in: ${guestName}` : 'Walk-in / Other';
    }
    if (selectedPlayers.length > 0) {
      const activeSess = activeSessions.find(s => s.session_id === targetSessionId);
      const tableLabel = activeSess ? ` (${activeSess.asset_label})` : '';
      return `${selectedPlayers.join(', ')}${tableLabel}`;
    }
    return 'Select player(s) / Walk-in...';
  };

  const load = () => {
    setLoading(true);
    Promise.all([foodApi.list(), assetsApi.activeSessions()])
      .then(([itemsRes, sessionsRes]) => {
        setItems(itemsRes.data);
        setActiveSessions(sessionsRes.data);
      })
      .catch(() => setError('Could not load the menu.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price || Number(price) <= 0) {
      setError('Enter a name and a price greater than 0.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await foodApi.create({ name: name.trim(), price: Number(price) });
      setShowAddModal(false);
      setName('');
      setPrice('');
      load();
      setToast('Item added');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add this item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id, itemName) => {
    const confirmed = window.confirm(`Remove "${itemName}"? This cannot be undone.`);
    if (!confirmed) return;
    
    setDeletingId(id);
    try {
      await foodApi.archive(id);
      load();
      setToast(`Removed ${itemName}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove this item.');
    } finally {
      setDeletingId(null);
    }
  };

  const addToCart = (itemId) => {
    setCart((prev) => {
      const next = { ...prev, [itemId]: (prev[itemId] || 0) + 1 };
      localStorage.setItem('billiards_food_cart', JSON.stringify(next));
      return next;
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) next[itemId] -= 1;
      else delete next[itemId];
      localStorage.setItem('billiards_food_cart', JSON.stringify(next));
      return next;
    });
  };

  const cartLines = Object.entries(cart).map(([itemId, qty]) => {
    const item = items.find((i) => i.id === itemId);
    return { item, qty };
  }).filter((l) => l.item);

  const cartTotal = cartLines.reduce((sum, l) => sum + l.item.price * l.qty, 0);

  const handleAssign = async () => {
    if (!isWalkin && selectedPlayers.length === 0) {
      setAssignMsg('Select at least one player or choose Walk-in Guest.');
      return;
    }
    setAssignBusy(true);
    setAssignMsg('');
    try {
      const lines = cartLines.map((l) => ({ food_item_id: l.item.id, quantity: l.qty }));
      const sessionIdPayload = isWalkin ? 'other' : targetSessionId;
      const orderedByPayload = isWalkin ? (guestName.trim() || 'Walk-in Guest') : selectedPlayers.join(', ');

      await foodApi.assign(sessionIdPayload, lines, orderedByPayload);
      setCart({});
      localStorage.removeItem('billiards_food_cart');
      setShowAssignModal(false);
      load();
    } catch (err) {
      setAssignMsg(err.response?.data?.detail || 'Could not assign this order.');
    } finally {
      setAssignBusy(false);
    }
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <h1 style={styles.pageTitle}>Food &amp; Drink</h1>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
          + Add Item
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div className="food-container" style={styles.container}>
        <div style={styles.menuPane}>
          {loading && <p style={{ color: 'var(--chalk-400)' }}>Loading…</p>}

          {!loading && items.length === 0 && (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--chalk-400)', margin: 0 }}>
                No menu items yet. Add your first product to start taking orders.
              </p>
            </Card>
          )}

          <div style={styles.grid}>
            {items.map((item, idx) => {
              const emoji = getFoodEmoji(item.name);
              return (
                <div
                  key={item.id}
                  className="food-card"
                  style={{ ...styles.itemCard, animationDelay: `${idx * 0.05}s` }}
                >
                  <div style={styles.itemImage}>
                    {getCategory(item.name) !== 'default' ? (
                      <Food3DModel name={item.name} />
                    ) : item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={styles.img} />
                    ) : (
                      <div style={styles.emojiWrap}>
                        <span style={styles.foodEmoji}>{emoji}</span>
                      </div>
                    )}
                    <div style={styles.foodImageGradient} />
                  </div>
                  <div style={styles.itemName}>{item.name}</div>
                  <div style={styles.itemPrice}>₹{item.price.toFixed(2)}</div>

                  <div style={styles.cartControls}>
                    {cart[item.id] ? (
                      <>
                        <button style={styles.qtyBtn} onClick={() => removeFromCart(item.id)}>−</button>
                        <span style={styles.qtyValue}>{cart[item.id]}</span>
                        <button style={styles.qtyBtn} onClick={() => addToCart(item.id)}>+</button>
                      </>
                    ) : (
                      <button style={styles.addToCartBtn} onClick={() => addToCart(item.id)}>
                        Add to bag
                      </button>
                    )}
                  </div>

                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    disabled={deletingId === item.id}
                    title="Remove this item"
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="food-cart-pane" style={styles.cartPane}>
          <div style={styles.sidebarCart}>
            <div style={styles.sidebarHeader}>
              <span style={{ fontSize: '1.2rem', marginRight: 8 }}>🛍️</span>
              <strong style={styles.sidebarTitle}>Current Order</strong>
            </div>

            {cartLines.length === 0 ? (
              <div style={styles.emptyCart}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>🛒</span>
                <p style={{ margin: 0, color: 'var(--chalk-400)', fontWeight: 500 }}>Your bag is empty.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--chalk-500)', marginTop: 4 }}>Add items from the menu to start a purchase.</p>
              </div>
            ) : (
              <div style={styles.cartContent}>
                <div style={styles.cartLinesList}>
                  {cartLines.map((line) => {
                    const emoji = getFoodEmoji(line.item.name);
                    return (
                      <div key={line.item.id} style={styles.cartLineItem}>
                        <div style={styles.cartLineEmoji}>{emoji}</div>
                        <div style={styles.cartLineDetails}>
                          <div style={styles.cartLineName}>{line.item.name}</div>
                          <div style={styles.cartLinePrice}>₹{line.item.price.toFixed(2)} each</div>
                        </div>
                        <div style={styles.cartLineControls}>
                          <button style={styles.cartQtyBtn} onClick={() => removeFromCart(line.item.id)}>−</button>
                          <span style={styles.cartQtyVal}>{line.qty}</span>
                          <button style={styles.cartQtyBtn} onClick={() => addToCart(line.item.id)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={styles.subtotalBlock}>
                  <div style={styles.subtotalRow}>
                    <span>Items Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ ...styles.subtotalRow, fontWeight: 700, color: 'var(--brass-300)', fontSize: '0.95rem', borderTop: '1px solid var(--felt-600)', paddingTop: 10, marginTop: 4, marginBottom: 0 }}>
                    <span>Amount Due</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button style={styles.sidebarAssignBtn} onClick={() => setShowAssignModal(true)}>
                  Assign &amp; Check Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <Modal title="Add Menu Item" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddItem}>
            <label style={styles.label}>Product name</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. French Fries"
            />
            <label style={styles.label}>Price (₹)</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 80"
            />
            {error && <div style={styles.errorBanner}>{error}</div>}
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Adding…' : 'Add to menu'}
            </button>
          </form>
        </Modal>
      )}

      {showAssignModal && (
        <Modal title="Assign Order" onClose={() => setShowAssignModal(false)}>
          <div>
            <label style={styles.label}>Select Player(s) / Walk-in</label>
            
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                style={styles.dropdownBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span>{getDropdownLabel()}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--chalk-400)' }}>▼</span>
              </button>

              {dropdownOpen && (
                <div style={styles.dropdownPanel}>
                  {/* Walk-in Option */}
                  <div
                    style={styles.dropdownRow}
                    onClick={handleToggleWalkin}
                  >
                    <input
                      type="checkbox"
                      checked={isWalkin}
                      readOnly
                      style={{ pointerEvents: 'none', marginRight: 8 }}
                    />
                    <strong>Other (Walk-in / Guest)</strong>
                  </div>

                  {/* Playing Players */}
                  {activeSessions.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--felt-600)', paddingTop: 4 }}>
                      {activeSessions.map((s) => (
                        <div key={s.session_id} style={styles.dropdownGroup}>
                          <div style={styles.dropdownGroupTitle}>{s.asset_label}</div>
                          {s.player_names.map((name) => {
                            const isChecked = selectedPlayers.includes(name) && targetSessionId === s.session_id;
                            const isDisabled = targetSessionId && targetSessionId !== s.session_id;
                            return (
                              <div
                                key={name}
                                style={{
                                  ...styles.dropdownRow,
                                  ...(isDisabled ? styles.dropdownRowDisabled : {})
                                }}
                                onClick={() => !isDisabled && handleTogglePlayer(name, s.session_id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  readOnly
                                  style={{ pointerEvents: 'none', marginRight: 8 }}
                                />
                                <span>{name}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isWalkin && (
              <div style={{ marginTop: 8 }}>
                <label style={styles.label}>Guest Name (Optional)</label>
                <input
                  style={styles.input}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Alice"
                />
              </div>
            )}

            <div style={styles.cartSummary}>
              {cartLines.map((l) => (
                <div key={l.item.id} style={styles.cartSummaryLine}>
                  {l.qty} × {l.item.name} — ₹{(l.item.price * l.qty).toFixed(2)}
                </div>
              ))}
              <div style={{ ...styles.cartSummaryLine, fontWeight: 700, marginTop: 6 }}>
                Total: ₹{cartTotal.toFixed(2)}
              </div>
            </div>

            {assignMsg && <div style={styles.errorBanner}>{assignMsg}</div>}

            <button style={styles.submitBtn} onClick={handleAssign} disabled={assignBusy}>
              {assignBusy ? 'Assigning…' : 'Confirm Assignment'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0-.7 12.1A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-2-1.9L7 7"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    color: 'var(--chalk-100)',
    margin: 0,
  },
  addBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 90,
  },
  itemCard: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    position: 'relative',
    textAlign: 'center',
    paddingBottom: 16,
  },
  itemImage: {
    width: '100%',
    height: 110,
    background: 'linear-gradient(135deg, #1B5C4C 0%, #0B2B22 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  emojiWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  foodEmoji: {
    fontSize: '2.6rem',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
    userSelect: 'none',
  },
  foodImageGradient: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 30% 70%, rgba(201,162,75,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  itemInitial: { fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--brass-300)' },
  itemName: { fontWeight: 600, color: 'var(--chalk-100)', fontSize: '0.92rem', padding: '0 10px' },
  itemPrice: { fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--chalk-400)', marginBottom: 10, padding: '0 10px' },
  cartControls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 10px' },
  addToCartBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--brass-500)',
    color: 'var(--brass-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 0',
    fontWeight: 600,
    fontSize: '0.82rem',
  },
  qtyBtn: {
    background: 'var(--felt-600)',
    border: 'none',
    color: 'var(--chalk-100)',
    width: 28,
    height: 28,
    borderRadius: 6,
    fontSize: '1rem',
  },
  qtyValue: { fontFamily: 'var(--font-mono)', color: 'var(--chalk-100)', minWidth: 20 },
  cartBar: {
    position: 'fixed',
    bottom: 24,
    right: 28,
    background: 'var(--felt-700)',
    border: '1px solid var(--brass-500)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    color: 'var(--chalk-100)',
    boxShadow: 'var(--shadow-raised)',
  },
  assignTriggerBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 16px',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  label: { display: 'block', fontSize: '0.8rem', color: 'var(--chalk-400)', marginBottom: 6 },
  input: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    marginBottom: 16,
  },
  cartSummary: {
    background: 'var(--felt-800)',
    borderRadius: 'var(--radius-sm)',
    padding: 12,
    fontSize: '0.85rem',
    color: 'var(--chalk-200)',
    marginBottom: 16,
  },
  cartSummaryLine: { marginBottom: 4 },
  submitBtn: {
    width: '100%',
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  errorBanner: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: 16,
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    background: 'rgba(139, 38, 53, 0.3)',
    border: '1px solid var(--rail-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--rail-300)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toast: {
    position: 'fixed',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--felt-700)',
    color: 'var(--chalk-100)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 18px',
    fontSize: '0.9rem',
    fontWeight: 500,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    zIndex: 1000,
    animation: 'slideUp 0.3s ease',
  },
  dropdownBtn: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dropdownPanel: {
    position: 'absolute',
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 120,
    boxShadow: 'var(--shadow-raised)',
    padding: '8px 0',
    marginTop: '-8px',
    marginBottom: 16,
  },
  dropdownGroup: {
    borderBottom: '1px solid var(--felt-600)',
    paddingBottom: 4,
    marginBottom: 4,
  },
  dropdownGroupTitle: {
    fontSize: '0.72rem',
    color: 'var(--brass-300)',
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '4px 12px',
    letterSpacing: '0.04em',
  },
  dropdownRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '0.88rem',
    color: 'var(--chalk-200)',
    userSelect: 'none',
    transition: 'background 0.15s ease',
  },
  dropdownRowDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  container: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
    minHeight: 'calc(100vh - 180px)',
  },
  menuPane: {
    flex: 1,
  },
  cartPane: {
    width: 310,
    position: 'sticky',
    top: 24,
    flexShrink: 0,
  },
  sidebarCart: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-lg)',
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 380,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16,
    borderBottom: '1px solid var(--felt-600)',
    paddingBottom: 12,
  },
  sidebarTitle: {
    fontSize: '1rem',
    color: 'var(--chalk-100)',
    fontFamily: 'var(--font-display)',
  },
  emptyCart: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '60px 10px',
  },
  cartContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  cartLinesList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
    maxHeight: 280,
    overflowY: 'auto',
    paddingRight: 4,
  },
  cartLineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--felt-700)',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--felt-600)',
  },
  cartLineEmoji: {
    fontSize: '1.4rem',
  },
  cartLineDetails: {
    flex: 1,
    minWidth: 0,
  },
  cartLineName: {
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--chalk-100)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cartLinePrice: {
    fontSize: '0.72rem',
    color: 'var(--chalk-400)',
    fontFamily: 'var(--font-mono)',
  },
  cartLineControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  cartQtyBtn: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '1px solid var(--felt-500)',
    background: 'transparent',
    color: 'var(--chalk-300)',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  cartQtyVal: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--chalk-100)',
    minWidth: 16,
    textAlign: 'center',
  },
  subtotalBlock: {
    background: 'var(--felt-700)',
    borderRadius: 'var(--radius-sm)',
    padding: 12,
    marginBottom: 16,
    border: '1px solid var(--felt-600)',
  },
  subtotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--chalk-300)',
    marginBottom: 6,
  },
  sidebarAssignBtn: {
    width: '100%',
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
};
