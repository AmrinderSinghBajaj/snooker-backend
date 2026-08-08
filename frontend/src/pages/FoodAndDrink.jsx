import { useState, useEffect } from 'react';
import { foodApi, assetsApi, customersApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { getFoodEmoji } from '../utils/categoryAssets';
import Food3DModel, { getCategory } from '../components/Food3DModel';
import { useTranslation } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { secureStorage } from '../utils/storage';

/*
  FRD B.6 - Food & Drink Section:
    Product Setup: Add button -> image, name, price.
    Ordering & Assignment: build a cart, "Assign to Active User" links
    items to a player currently at a table; cost added to their bill.
*/
const getStockBadgeStyle = (qty) => {
  if (qty <= 0) {
    return {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#F87171',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    };
  }
  if (qty <= 10) {
    return {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#FBBF24',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    };
  }
  return {
    background: 'rgba(16, 185, 129, 0.12)',
    color: '#34D399',
    border: '1px solid rgba(16, 185, 129, 0.25)',
  };
};

export default function FoodAndDrink() {
  const { t, lang } = useTranslation();
  const { admin } = useAuth();
  const canEditFood = admin?.role === 'Club Owner' || admin?.role === 'superadmin' || !!admin?.permissions?.foodDrink?.edit;
  const canDeleteFood = admin?.role === 'Club Owner' || admin?.role === 'superadmin' || !!admin?.permissions?.foodDrink?.delete;
  const [items, setItems] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [inventory, setInventory] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');

  const [cart, setCart] = useState(() => {
    try {
      const saved = secureStorage.getItem('billiards_food_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  const [assignPlayerName, setAssignPlayerName] = useState('');

  useEffect(() => {
    if (!showAssignModal) {
      setAssignPlayerName('');
    }
  }, [showAssignModal]);

  const load = () => {
    setLoading(true);
    Promise.all([
      foodApi.list(),
      assetsApi.activeSessions(),
      customersApi.list().catch(() => ({ data: [] }))
    ])
      .then(([itemsRes, sessionsRes, customersRes]) => {
        setItems(itemsRes.data || []);
        setActiveSessions(sessionsRes.data || []);
        setCustomers(customersRes.data || []);
      })
      .catch(() => setError(t('couldNotLoadMenu')))
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
      setError(t('enterNameAndPrice'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await foodApi.create({
        name: name.trim(),
        price: Number(price),
        inventory: inventory ? Number(inventory) : 0
      });
      setShowAddModal(false);
      setName('');
      setPrice('');
      setInventory('');
      load();
      setToast(t('itemAdded'));
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotAddItem'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    setInventory(item.inventory.toString());
    setError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price || Number(price) <= 0) {
      setError(t('enterNameAndPrice'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await foodApi.update(editingItem.id, {
        name: name.trim(),
        price: Number(price),
        inventory: inventory ? Number(inventory) : 0
      });
      setEditingItem(null);
      setName('');
      setPrice('');
      setInventory('');
      load();
      setToast(lang === 'hi' ? 'आइटम अपडेट किया गया' : lang === 'pb' ? 'ਆਈਟਮ ਅਪਡੇਟ ਕੀਤੀ ਗਈ' : 'Item updated successfully');
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotAddItem'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id, itemName) => {
    const confirmed = window.confirm(`${t('removeFoodItemConfirmed').replace('food item', `"${itemName}"`)}`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await foodApi.archive(id);
      load();
      setToast(`${t('removedFoodItem')} ${itemName}`);
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotRemoveItem'));
    } finally {
      setDeletingId(null);
    }
  };

  const addToCart = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setCart((prev) => {
      const currentQty = prev[itemId] || 0;
      if (currentQty >= item.inventory) return prev;
      const next = { ...prev, [itemId]: currentQty + 1 };
      secureStorage.setItem('billiards_food_cart', JSON.stringify(next));
      return next;
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) next[itemId] -= 1;
      else delete next[itemId];
      secureStorage.setItem('billiards_food_cart', JSON.stringify(next));
      return next;
    });
  };

  const cartLines = Object.entries(cart).map(([itemId, qty]) => {
    const item = items.find((i) => i.id === itemId);
    return { item, qty };
  }).filter((l) => l.item);

  const cartTotal = cartLines.reduce((sum, l) => sum + l.item.price * l.qty, 0);

  const handleAssign = async () => {
    const nameToAssign = assignPlayerName.trim();
    if (!nameToAssign) {
      setAssignMsg(lang === 'hi' ? 'कृपया खिलाड़ी का नाम दर्ज करें या चुनें' : lang === 'pb' ? 'ਕਿਰਪਾ ਕਰਕੇ ਖਿਡਾਰੀ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ ਜਾਂ ਚੁਣੋ' : 'Please enter or select a player name');
      return;
    }
    setAssignBusy(true);
    setAssignMsg('');
    try {
      const lines = cartLines.map((l) => ({ food_item_id: l.item.id, quantity: l.qty }));

      let sessionIdPayload = 'other';
      const matchedSession = activeSessions.find((s) =>
        (s.player_names || []).some((p) => p.toLowerCase().trim() === nameToAssign.toLowerCase()) ||
        (s.asset_label || '').toLowerCase().trim() === nameToAssign.toLowerCase()
      );
      if (matchedSession) {
        sessionIdPayload = matchedSession.session_id;
      }

      await foodApi.assign(sessionIdPayload, lines, nameToAssign);
      setCart({});
      secureStorage.removeItem('billiards_food_cart');
      setShowAssignModal(false);
      load();
    } catch (err) {
      setAssignMsg(err.response?.data?.detail || t('couldNotAssignOrder'));
    } finally {
      setAssignBusy(false);
    }
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <h1 style={styles.pageTitle}>{t('foodDrinkTitle')}</h1>
        {canEditFood && (
          <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
            + {t('addItem')}
          </button>
        )}
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div className="food-container" style={styles.container}>
        <div style={styles.menuPane}>
          {loading && <p style={{ color: 'var(--chalk-400)' }}>{t('loading')}</p>}

          {!loading && items.length === 0 && (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--chalk-400)', margin: 0 }}>
                {t('noMenuItems')}
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
                    {item.inventory <= 0 ? (
                      <button
                        style={{
                          ...styles.addToCartBtn,
                          opacity: 0.5,
                          cursor: 'not-allowed',
                          pointerEvents: 'none',
                          background: 'var(--felt-600)',
                          border: '1px solid var(--felt-500)',
                          color: 'var(--chalk-400)'
                        }}
                        disabled
                      >
                        {lang === 'hi' ? 'स्टॉक में नहीं' : lang === 'pb' ? 'ਸਟਾਕ ਵਿੱਚ ਨਹੀਂ' : 'Out of Stock'}
                      </button>
                    ) : cart[item.id] ? (
                      <>
                        <button style={styles.qtyBtn} onClick={() => removeFromCart(item.id)}>−</button>
                        <span style={styles.qtyValue}>{cart[item.id]}</span>
                        <button
                          style={{
                            ...styles.qtyBtn,
                            ...(cart[item.id] >= item.inventory ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {})
                          }}
                          disabled={cart[item.id] >= item.inventory}
                          onClick={() => addToCart(item.id)}
                        >+</button>
                      </>
                    ) : (
                      <button style={styles.addToCartBtn} onClick={() => addToCart(item.id)}>
                        {t('addToBag')}
                      </button>
                    )}
                  </div>

                  {/* Inventory Under Add to Bag Button */}
                  <div style={{
                    fontSize: '0.74rem',
                    color: item.inventory <= 0 ? '#F87171' : 'var(--chalk-400)',
                    marginTop: 8,
                    fontWeight: 500,
                    textAlign: 'center'
                  }}>
                    {item.inventory <= 0
                      ? (lang === 'hi' ? 'आउट ऑफ स्टॉक' : lang === 'pb' ? 'ਸਟਾਕ ਖਤਮ' : 'Out of Stock')
                      : item.inventory <= 10
                        ? (lang === 'hi' ? `केवल ${item.inventory} शेष` : lang === 'pb' ? `ਸਿਰਫ ${item.inventory} ਬਾਕੀ` : `Only ${item.inventory} left`)
                        : `${item.inventory} ${lang === 'hi' ? 'स्टॉक में' : lang === 'pb' ? 'ਸਟਾਕ ਵਿੱਚ' : 'in stock'}`}
                  </div>

                  {/* Floating Absolute Icons at the Top */}
                  {canEditFood && (
                    <button
                      style={styles.editBtn}
                      onClick={() => handleEditClick(item)}
                      title="Edit this item"
                    >
                      <EditIcon />
                    </button>
                  )}

                  {canDeleteFood && (
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      disabled={deletingId === item.id}
                      title="Remove this item"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="food-cart-pane" style={styles.cartPane}>
          <div style={styles.sidebarCart}>
            <div style={styles.sidebarHeader}>
              <span style={{ fontSize: '1.2rem', marginRight: 8 }}>🛍️</span>
              <strong style={styles.sidebarTitle}>{t('currentOrder')}</strong>
            </div>

            {cartLines.length === 0 ? (
              <div style={styles.emptyCart}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>🛒</span>
                <p style={{ margin: 0, color: 'var(--chalk-400)', fontWeight: 500 }}>{t('bagIsEmpty')}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--chalk-500)', marginTop: 4 }}>{t('addItemsToStart')}</p>
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
                          <button
                            style={{
                              ...styles.cartQtyBtn,
                              ...(line.qty >= line.item.inventory ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {})
                            }}
                            disabled={line.qty >= line.item.inventory}
                            onClick={() => addToCart(line.item.id)}
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={styles.subtotalBlock}>
                  <div style={styles.subtotalRow}>
                    <span>{t('itemsTotal')}</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ ...styles.subtotalRow, fontWeight: 700, color: 'var(--brass-300)', fontSize: '0.95rem', borderTop: '1px solid var(--felt-600)', paddingTop: 10, marginTop: 4, marginBottom: 0 }}>
                    <span>{t('amountDue')}</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button style={styles.sidebarAssignBtn} onClick={() => setShowAssignModal(true)}>
                  {t('assignCheckOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <Modal title={t('addMenuItem')} onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddItem}>
            <label style={styles.label}>{t('productName')}</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. French Fries"
            />
            <label style={styles.label}>{t('priceRs')}</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 80"
            />
            <label style={styles.label}>{lang === 'hi' ? 'इन्वेंटरी (मात्रा)' : lang === 'pb' ? 'ਇਨਵੈਂਟਰੀ (ਮਾਤਰਾ)' : 'Inventory (Quantity)'}</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
              placeholder="e.g. 50"
            />
            {error && <div style={styles.errorBanner}>{error}</div>}
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? t('addingEllipsis') : t('addToMenu')}
            </button>
          </form>
        </Modal>
      )}

      {editingItem && (
        <Modal title={lang === 'hi' ? 'मेन्यू आइटम संपादित करें' : lang === 'pb' ? 'ਮੇਨੂ ਆਈਟਮ ਸੋਧੋ' : 'Edit Menu Item'} onClose={() => {
          setEditingItem(null);
          setName('');
          setPrice('');
          setInventory('');
          setError('');
        }}>
          <form onSubmit={handleEditSubmit}>
            <label style={styles.label}>{t('productName')}</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. French Fries"
            />
            <label style={styles.label}>{t('priceRs')}</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 80"
            />
            <label style={styles.label}>{lang === 'hi' ? 'इन्वेंटरी (मात्रा)' : lang === 'pb' ? 'ਇਨਵੈਂਟਰੀ (ਮਾਤਰਾ)' : 'Inventory (Quantity)'}</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
              placeholder="e.g. 50"
            />
            {error && <div style={styles.errorBanner}>{error}</div>}
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? (lang === 'hi' ? 'अपडेट किया जा रहा है...' : lang === 'pb' ? 'ਅਪਡੇਟ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...' : 'Updating...') : (lang === 'hi' ? 'बदलाव सहेजें' : lang === 'pb' ? 'ਤਬਦੀਲੀਆਂ ਸੁਰੱਖਿਅਤ ਕਰੋ' : 'Save Changes')}
            </button>
          </form>
        </Modal>
      )}

      {showAssignModal && (
        <Modal title={t('assignOrder')} onClose={() => setShowAssignModal(false)}>
          <div>
            <label style={styles.label}>{t('selectPlayerWalkin')}</label>

            <input
              style={styles.input}
              placeholder="Player Name"
              value={assignPlayerName}
              onChange={(e) => setAssignPlayerName(e.target.value.slice(0, 30))}
              list="food-customer-suggestions"
              autoFocus
            />

            <datalist id="food-customer-suggestions">
              {activeSessions.flatMap(s => s.player_names || []).map((pName, idx) => (
                <option key={`active_${idx}`} value={pName} />
              ))}
              {customers.map((c) => (
                <option key={c.id || c._id} value={c.display_name} />
              ))}
            </datalist>

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

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  itemPrice: { fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--brass-300)', fontWeight: 700, marginBottom: 10, padding: '0 10px' },
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
    zIndex: 10,
  },
  editBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    background: 'rgba(201, 162, 75, 0.25)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--brass-300)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    zIndex: 10,
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
  selectInput: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    marginBottom: 16,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  dropdownPanel: {
    position: 'relative',
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    maxHeight: '180px',
    overflowY: 'auto',
    zIndex: 10,
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
    padding: '8px 0',
    marginTop: 6,
    marginBottom: 14,
    boxSizing: 'border-box',
  },
  dropdownGroup: {
    borderBottom: '1px solid var(--felt-600)',
    paddingBottom: 4,
    marginBottom: 4,
  },
  dropdownSectionHeader: {
    fontSize: '0.72rem',
    color: 'var(--brass-400, #FBBF24)',
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '8px 12px 4px 12px',
    letterSpacing: '0.05em',
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
