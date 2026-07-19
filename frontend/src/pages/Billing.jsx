import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../utils/translations';
import { billingApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';
import EditBillingModal from '../components/EditBillingModal';
import ManualEntryModal from '../components/ManualEntryModal';

/*
  FRD B.4 - Payment Status section, redesigned for clarity and speed:
    - Every record is scannable at a glance: who played, how long, what's owed.
    - "Edit" opens a fully free-form editor - built for the common real case
      where the table was stopped under one name but someone else actually pays.
    - "Add entry" lets the owner log play that never went through Start/Stop.
    - Manual / edited rows carry a quiet badge so the owner always knows
       which records are system-tracked vs. hand-entered.
*/
function getSaleTypeName(r, t) {
  const hasTime = r.time_played_minutes > 0;
  const hasFood = r.food_amount > 0;
  if (hasTime && hasFood) return t('gameAndFood');
  if (hasTime) return t('gameOnly');
  if (hasFood) return t('cafeSale');
  return t('gameOnly');
}

function getSaleTypeStyle(r) {
  const hasTime = r.time_played_minutes > 0;
  const hasFood = r.food_amount > 0;
  
  let color = 'var(--chalk-400)';
  let bg = 'rgba(255,255,255,0.05)';
  let border = '1px solid rgba(255,255,255,0.08)';
  
  if (hasTime && hasFood) {
    color = 'var(--brass-300)';
    bg = 'rgba(201,162,75,0.1)';
    border = '1px solid rgba(201,162,75,0.2)';
  } else if (hasTime) {
    color = 'var(--green-go)';
    bg = 'rgba(47,158,99,0.1)';
    border = '1px solid rgba(47,158,99,0.2)';
  } else if (hasFood) {
    color = 'var(--orange-warn)';
    bg = 'rgba(217,123,43,0.1)';
    border = '1px solid rgba(217,123,43,0.2)';
  }
  
  return {
    display: 'inline-block',
    fontSize: '0.66rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '2px 8px',
    borderRadius: 4,
    color,
    background: bg,
    border,
    alignSelf: 'flex-start',
    marginTop: 4,
  };
}

export default function Billing() {
  const { t, lang } = useTranslation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [detailSession, setDetailSession] = useState(null);
  const [detail, setDetail] = useState(null);
  const [unpaidSession, setUnpaidSession] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [pendingAmount, setPendingAmount] = useState('');
  const [editRecord, setEditRecord] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'outstanding'
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodPrompt, setPaymentMethodPrompt] = useState(null);
  const [outstandingDetailPlayer, setOutstandingDetailPlayer] = useState(null);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const load = () => {
    setLoading(true);
    billingApi.records()
      .then((res) => setRecords(res.data))
      .catch(() => setError(t('couldNotLoadBilling')))
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

  const openDetail = async (record) => {
    setDetailSession(record);
    try {
      const res = await billingApi.detail(record.session_id);
      setDetail(res.data);
    } catch {
      setError(t('couldNotLoadDetails'));
    }
  };

  const handleConfirmPaymentMethod = async (method) => {
    if (!paymentMethodPrompt) return;
    const { type, id, playerName, records } = paymentMethodPrompt;
    setPaymentMethodPrompt(null);

    if (type === 'single') {
      setBusyId(id);
      try {
        await billingApi.markPaid(id, method);
        load();
        setToast(t('markedAsPaid'));
      } catch {
        setError(t('couldNotMarkPaid'));
      } finally {
        setBusyId(null);
      }
    } else if (type === 'all') {
      setBusyId(`mark-all-${playerName}`);
      try {
        let successCount = 0;
        for (const record of records) {
          try {
            await billingApi.markPaid(record.session_id, method);
            successCount++;
          } catch (err) {
            console.error(`Failed to mark ${record.session_id} as paid:`, err);
          }
        }
        load();
        setToast(t('markedAllAsPaid').replace('records', `${successCount}/${records.length} records`));
      } catch (err) {
        setError(t('errorMarkingPaid'));
      } finally {
        setBusyId(null);
      }
    }
  };

  const openUnpaid = (record) => {
    setUnpaidSession(record);
    setPaidAmount('');
    setPendingAmount('');
  };

  const submitUnpaid = async () => {
    setBusyId(unpaidSession.session_id);
    setError('');
    const paid = Number(paidAmount) || 0;
    const pending = Number(pendingAmount) || 0;
    if (Math.round((paid + pending) * 100) !== Math.round(unpaidSession.total_amount * 100)) {
      setError(`${t('paidAmountMustEqualTotal')} (₹${unpaidSession.total_amount.toFixed(2)}).`);
      setBusyId(null);
      return;
    }
    try {
      await billingApi.markUnpaid(unpaidSession.session_id, paid, pending);
      setUnpaidSession(null);
      load();
      setToast(t('balanceRecorded'));
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotSave'));
    } finally {
      setBusyId(null);
    }
  };

  const handleEditSaved = () => {
    setEditRecord(null);
    load();
    setToast(t('entryUpdated'));
  };

  const handleManualSaved = () => {
    setShowManualEntry(false);
    load();
    setToast(t('entryAdded'));
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      `${t('removeConfirmed').replace('?', ` #${record.serial_number} (${record.player_names.join(', ')})?`)}`
    );
    if (!confirmed) return;
    setBusyId(record.session_id);
    try {
      await billingApi.remove(record.session_id);
      load();
      setToast(t('entryRemoved'));
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotRemoveEntry'));
    } finally {
      setBusyId(null);
    }
  };

  const totals = records.reduce(
    (acc, r) => {
      acc.total += r.total_amount;
      acc.pending += r.payment_status === 'unpaid' ? r.pending_amount : 0;
      return acc;
    },
    { total: 0, pending: 0 }
  );  // Filter records based on active tab & search query
  const filteredRecords = (activeTab === 'outstanding' 
    ? records.filter(r => r.payment_status === 'unpaid')
    : records
  ).filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return r.player_names.some(name => name.toLowerCase().includes(query));
  });

  // For outstanding tab: aggregate unpaid amounts by player, filtered by search query
  const outstandingByPlayer = activeTab === 'outstanding'
    ? (() => {
        const map = {};
        records
          .filter(r => r.payment_status === 'unpaid')
          .filter(r => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase().trim();
            return r.player_names.some(name => name.toLowerCase().includes(query));
          })
          .forEach(r => {
            const primaryPlayer = r.player_names?.[0] || 'Unknown';
            if (!map[primaryPlayer]) {
              map[primaryPlayer] = {
                player_name: primaryPlayer,
                total_outstanding: 0,
                record_count: 0,
                latest_date: r.start_time,
                all_records: [],
              };
            }
            map[primaryPlayer].total_outstanding += r.pending_amount || 0;
            map[primaryPlayer].record_count += 1;
            map[primaryPlayer].latest_date = new Date(r.start_time) > new Date(map[primaryPlayer].latest_date)
              ? r.start_time
              : map[primaryPlayer].latest_date;
            map[primaryPlayer].all_records.push(r);
          });
        return Object.values(map).sort((a, b) => new Date(b.latest_date) - new Date(a.latest_date));
      })()
    : [];

  const outstandingTotals = outstandingByPlayer.reduce(
    (acc, item) => {
      acc.total += item.total_outstanding;
      acc.count += item.record_count;
      return acc;
    },
    { total: 0, count: 0 }
  );

  const currentRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  const currentOutstanding = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return outstandingByPlayer.slice(start, start + PAGE_SIZE);
  }, [outstandingByPlayer, page]);

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>{t('billingTitle')}</h1>
          <p style={styles.subtitle}>{t('billingSubtitle')}</p>
        </div>
        <button className="billing-add-btn" style={styles.addBtn} onClick={() => setShowManualEntry(true)}>
          <span style={styles.plusIcon}>+</span> {t('addEntry')}
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'all' ? styles.tabBtnActive : styles.tabBtnInactive),
          }}
          onClick={() => setActiveTab('all')}
        >
          {t('allBills')}
        </button>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'outstanding' ? styles.tabBtnActive : styles.tabBtnInactive),
          }}
          onClick={() => setActiveTab('outstanding')}
        >
          {t('outstandingTab')} ({records.filter(r => r.payment_status === 'unpaid').length})
        </button>
      </div>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder={t('searchByPlayer')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button style={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
            {t('cancel')}
          </button>
        )}
      </div>

      {/* Stats Row - Different content for each tab */}
      {!loading && records.length > 0 && (
        <div style={styles.statsRow}>
          {activeTab === 'all' ? (
            <>
              <StatPill label={t('totalRevenue')} value={`₹${totals.total.toFixed(2)}`} accent="brass" />
              <StatPill label={t('outstandingTab')} value={`₹${totals.pending.toFixed(2)}`} accent={totals.pending > 0 ? 'orange' : 'green'} />
              <StatPill label={t('history')} value={String(records.length)} accent="neutral" />
            </>
          ) : (
            <>
              <StatPill label={t('totalRevenue')} value={`₹${outstandingTotals.total.toFixed(2)}`} accent="orange" />
              <StatPill label={t('unpaid')} value={String(outstandingTotals.count)} accent="neutral" />
              <StatPill label={t('players')} value={String(outstandingByPlayer.length)} accent="neutral" />
            </>
          )}
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}
      {loading && <SkeletonTable />}

      {!loading && records.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--chalk-400)', margin: 0 }}>
            {t('noBillingRecords')}
          </p>
        </Card>
      )}

      {/* All Bills View */}
      {!loading && records.length > 0 && activeTab === 'all' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t('serialNo')}</th>
                <th style={styles.th}>{t('player')}</th>
                <th style={styles.th}>{lang === 'hi' ? 'टेबल' : lang === 'pb' ? 'ਟੇਬਲ' : 'Table'}</th>
                <th style={styles.th}>{t('timePlayed')}</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>{t('food')}</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>{t('total')}</th>
                <th style={styles.th}>{t('status')}</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((r, i) => (
                <tr
                  key={r.session_id}
                  style={{
                    ...styles.tr,
                    animation: `rowFadeIn 0.32s ease ${Math.min(i * 0.035, 0.4)}s both`,
                  }}
                  className="billing-row"
                >
                  <td style={styles.td}>
                    <span style={styles.serial}>{r.serial_number}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.playerCell}>
                      <span>{r.player_names.join(', ')}</span>
                      {(r.is_manual_entry || r.was_edited) && (
                        <span style={r.is_manual_entry ? styles.manualBadge : styles.editedBadge}>
                          {r.is_manual_entry ? (lang === 'hi' ? 'मैन्युअल' : lang === 'pb' ? 'ਮੈਨੂਅਲ' : 'Manual') : (lang === 'hi' ? 'संपादित' : lang === 'pb' ? 'ਸੋਧਿਆ' : 'Edited')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--chalk-200)' }}>{r.asset_label}</span>
                      <span style={getSaleTypeStyle(r)}>{getSaleTypeName(r, t)}</span>
                    </div>
                  </td>
                  <td style={styles.tdMono}>{r.time_played_minutes} {lang === 'hi' ? 'मिनट' : lang === 'pb' ? 'ਮਿੰਟ' : 'min'}</td>
                  <td style={{ ...styles.tdMono, textAlign: 'right' }}>₹{r.food_amount.toFixed(2)}</td>
                  <td style={{ ...styles.tdMono, textAlign: 'right', fontWeight: 700, color: 'var(--chalk-100)' }}>
                    ₹{r.total_amount.toFixed(2)}
                  </td>
                  <td style={styles.td}>
                    {r.payment_status ? (
                      <span style={{
                        ...styles.statusPill,
                        ...(r.payment_status === 'paid' ? styles.paidPill : styles.unpaidPill),
                      }}>
                        <span style={{
                          ...styles.statusDot,
                          background: r.payment_status === 'paid' ? 'var(--green-go)' : 'var(--orange-warn)',
                        }} />
                        {r.payment_status === 'paid' ? (
                          <span>
                            {t('paid')}
                            {r.payment_method && (
                              <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: 4, textTransform: 'capitalize' }}>
                                • {t(r.payment_method)}
                              </span>
                            )}
                          </span>
                        ) : (
                          `₹${r.pending_amount.toFixed(0)} ${lang === 'hi' ? 'बकाया' : lang === 'pb' ? 'ਬਕਾਇਆ' : 'due'}`
                        )}
                      </span>
                    ) : (
                      <div style={styles.payBtnRow}>
                        <button
                          style={styles.paidBtn}
                          onClick={() => setPaymentMethodPrompt({
                            type: 'single',
                            id: r.session_id,
                            playerName: r.player_names.join(', '),
                            amount: r.total_amount
                          })}
                          disabled={busyId === r.session_id}
                        >
                          {t('paid')}
                        </button>
                        <button style={styles.unpaidBtn} onClick={() => openUnpaid(r)} disabled={busyId === r.session_id}>
                          {t('unpaid')}
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <button style={styles.iconBtn} onClick={() => openDetail(r)} title="See detail" aria-label="See detail">
                        <EyeIcon />
                      </button>
                      <button style={styles.iconBtn} onClick={() => setEditRecord(r)} title="Edit" aria-label="Edit">
                        <EditIcon />
                      </button>
                      <button
                        style={styles.iconBtn}
                        onClick={() => handleDelete(r)}
                        title="Remove entry"
                        aria-label="Remove entry"
                        disabled={busyId === r.session_id}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Outstanding Bills View */}
      {!loading && records.length > 0 && activeTab === 'outstanding' && outstandingByPlayer.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{lang === 'hi' ? 'ग्राहक का नाम' : lang === 'pb' ? 'ਗਾਹਕ ਦਾ ਨਾਮ' : 'Customer Name'}</th>
                <th style={styles.th}>{lang === 'hi' ? 'अवैतनिक रिकॉर्ड' : lang === 'pb' ? 'ਬਿਨਾਂ ਭੁਗਤਾਨ ਰਿਕਾਰਡ' : 'Unpaid Records'}</th>
                <th style={styles.th}>{t('latestActivity')}</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>{lang === 'hi' ? 'कुल बकाया' : lang === 'pb' ? 'ਕੁੱਲ ਬਕਾਇਆ' : 'Total Outstanding'}</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {currentOutstanding.map((item, i) => (
                <tr
                  key={item.player_name}
                  style={{
                    ...styles.tr,
                    animation: `rowFadeIn 0.32s ease ${Math.min(i * 0.035, 0.4)}s both`,
                    background: 'rgba(217,123,43,0.06)',
                  }}
                  className="outstanding-row"
                >
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600, color: 'var(--chalk-100)' }}>{item.player_name}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--chalk-300)' }}>{item.record_count}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--chalk-400)' }}>
                      {new Date(item.latest_date).toLocaleDateString()} at {new Date(item.latest_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td style={{ ...styles.tdMono, textAlign: 'right', fontWeight: 700, color: 'var(--orange-warn)' }}>
                    ₹{item.total_outstanding.toFixed(2)}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <button
                        style={styles.iconBtn}
                        onClick={() => {
                          setOutstandingDetailPlayer(item);
                        }}
                        title="View details"
                        aria-label="View details"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        style={{...styles.iconBtn, ...{color: 'var(--green-go)'}}}
                        onClick={() => {
                          setPaymentMethodPrompt({
                            type: 'all',
                            id: `mark-all-${item.player_name}`,
                            playerName: item.player_name,
                            amount: item.total_outstanding,
                            records: item.all_records,
                          });
                        }}
                        disabled={busyId === `mark-all-${item.player_name}`}
                        title="Mark all as paid"
                        aria-label="Mark all as paid"
                      >
                        <CheckmarkIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!loading && records.length > 0 && activeTab === 'outstanding' && outstandingByPlayer.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--chalk-400)', margin: 0 }}>
            ✓ {lang === 'hi' ? 'कोई बकाया बिल नहीं! सभी ग्राहकों ने भुगतान कर दिया है।' : lang === 'pb' ? 'ਕੋਈ ਬਕਾਇਆ ਬਿੱਲ ਨਹੀਂ! ਸਾਰੇ ਗਾਹਕਾਂ ਨੇ ਭੁਗਤਾਨ ਕਰ ਦਿੱਤਾ ਹੈ।' : 'No outstanding bills! All customers have paid.'}
          </p>
        </Card>
      )}

      {/* Pagination Footer */}
      {!loading && activeTab === 'all' && filteredRecords.length > PAGE_SIZE && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...styles.pageBtn, ...(page === 1 ? styles.pageBtnDisabled : {}) }}
          >
            ← {t('previous')}
          </button>
          <span style={styles.pageInfo}>
            {t('page')} {page} {t('of')} {Math.ceil(filteredRecords.length / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(filteredRecords.length / PAGE_SIZE), p + 1))}
            disabled={page === Math.ceil(filteredRecords.length / PAGE_SIZE)}
            style={{ ...styles.pageBtn, ...(page === Math.ceil(filteredRecords.length / PAGE_SIZE) ? styles.pageBtnDisabled : {}) }}
          >
            {t('next')} →
          </button>
        </div>
      )}

      {!loading && activeTab === 'outstanding' && outstandingByPlayer.length > PAGE_SIZE && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...styles.pageBtn, ...(page === 1 ? styles.pageBtnDisabled : {}) }}
          >
            ← {t('previous')}
          </button>
          <span style={styles.pageInfo}>
            {t('page')} {page} {t('of')} {Math.ceil(outstandingByPlayer.length / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(outstandingByPlayer.length / PAGE_SIZE), p + 1))}
            disabled={page === Math.ceil(outstandingByPlayer.length / PAGE_SIZE)}
            style={{ ...styles.pageBtn, ...(page === Math.ceil(outstandingByPlayer.length / PAGE_SIZE) ? styles.pageBtnDisabled : {}) }}
          >
            {t('next')} →
          </button>
        </div>
      )}

      {detailSession && (
        <Modal title={`${t('viewDetail')} — ${detailSession.asset_label}`} onClose={() => { setDetailSession(null); setDetail(null); }}>
          {!detail ? (
            <p style={{ color: 'var(--chalk-400)' }}>{t('loading')}</p>
          ) : (
            <div>
              <p style={styles.detailLine}>
                <strong>{detail.player_names.join(', ')}</strong>
              </p>
              <p style={styles.detailLine}>
                {new Date(detail.start_time).toLocaleString()} → {new Date(detail.stop_time).toLocaleString()}
              </p>
              <p style={styles.detailLine}>{t('timeCharge')}: ₹{detail.time_amount.toFixed(2)}</p>
              {detail.food_lines.length > 0 && (
                <>
                  <p style={styles.detailLine}><strong>{t('foodDrinkLabel')}:</strong></p>
                  <ul style={styles.foodList}>
                    {detail.food_lines.map((line, i) => (
                      <li key={i}>{line.quantity} × {line.name} {line.ordered_by ? `(${line.ordered_by})` : ''} — ₹{line.line_total.toFixed(2)}</li>
                    ))}
                  </ul>
                </>
              )}
              <p style={{ ...styles.detailLine, fontWeight: 700, fontSize: '1.05rem' }}>
                {t('total')}: ₹{detail.total_amount.toFixed(2)}
              </p>
            </div>
          )}
        </Modal>
      )}

      {unpaidSession && (
        <Modal title={t('unpaidBalance')} onClose={() => setUnpaidSession(null)}>
          <p style={styles.detailLine}>
            {t('totalDue')} <strong>₹{unpaidSession.total_amount.toFixed(2)}</strong>
          </p>
          <label style={styles.label}>{t('paidAmountLabelEdit')}</label>
          <input style={styles.input} type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          <label style={styles.label}>{t('pendingAmountLabelEdit')}</label>
          <input style={styles.input} type="number" value={pendingAmount} onChange={(e) => setPendingAmount(e.target.value)} />
          {error && <div style={styles.errorBanner}>{error}</div>}
          <button style={styles.saveBtn} onClick={submitUnpaid} disabled={busyId === unpaidSession.session_id}>
            {busyId === unpaidSession.session_id ? t('savingEllipsis') : t('saveChanges')}
          </button>
        </Modal>
      )}

      {editRecord && (
        <EditBillingModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={handleEditSaved}
        />
      )}

      {paymentMethodPrompt && (
        <Modal
          title={t('selectPaymentMethod')}
          onClose={() => setPaymentMethodPrompt(null)}
          width={400}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--chalk-200)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              {lang === 'hi' ? 'भुगतान की पुष्टि: ' : lang === 'pb' ? 'ਭੁਗਤਾਨ ਦੀ ਪੁਸ਼ਟੀ: ' : 'Confirming payment of '} <strong>₹{paymentMethodPrompt.amount.toFixed(2)}</strong> {lang === 'hi' ? 'के लिए ' : lang === 'pb' ? 'ਲਈ ' : 'for '}
              <strong>{paymentMethodPrompt.playerName}</strong>.
              {paymentMethodPrompt.type === 'all' && (lang === 'hi' ? ` इससे उनके सभी ${paymentMethodPrompt.records.length} बकाया रिकॉर्ड्स भुगतान किए गए चिह्नित हो जाएंगे।` : lang === 'pb' ? ` ਇਸ ਨਾਲ ਉਹਨਾਂ ਦੇ ਸਾਰੇ ${paymentMethodPrompt.records.length} ਬਕਾਇਆ ਰਿਕਾਰਡ ਭੁਗਤਾਨ ਕੀਤੇ ਚਿੰਨ੍ਹਿਤ ਹੋ ਜਾਣਗੇ।` : ` This will mark all ${paymentMethodPrompt.records.length} outstanding records as paid.`)}
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                style={{
                  flex: 1,
                  background: 'rgba(79, 70, 229, 0.15)',
                  border: '2px solid #4F46E5',
                  color: '#818CF8',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => handleConfirmPaymentMethod('online')}
              >
                <span style={{ fontSize: '1.25rem' }}>📱</span>
                {t('online')} (UPI/GPay)
              </button>

              <button
                style={{
                  flex: 1,
                  background: 'rgba(201, 162, 75, 0.15)',
                  border: '2px solid var(--brass-500)',
                  color: 'var(--brass-300)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => handleConfirmPaymentMethod('offline')}
              >
                <span style={{ fontSize: '1.25rem' }}>💵</span>
                {t('offline')} (Cash)
              </button>
            </div>

            <button
              style={{
                background: 'transparent',
                border: '1px solid var(--felt-500)',
                color: 'var(--chalk-400)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 0',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 8,
              }}
              onClick={() => setPaymentMethodPrompt(null)}
            >
              {t('cancel')}
            </button>
          </div>
        </Modal>
      )}

      {outstandingDetailPlayer && (
        <Modal
          title={`${t('unpaidBalance')} — ${outstandingDetailPlayer.player_name}`}
          onClose={() => setOutstandingDetailPlayer(null)}
          width={500}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--felt-600)', paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--chalk-400)' }}>{lang === 'hi' ? 'कुल बकाया' : lang === 'pb' ? 'ਕੁੱਲ ਬਕਾਇਆ' : 'Total Outstanding'}</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--orange-warn)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  ₹{outstandingDetailPlayer.total_outstanding.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--chalk-400)' }}>{lang === 'hi' ? 'अवैतनिक रिकॉर्ड' : lang === 'pb' ? 'ਬਿਨਾਂ ਭੁਗਤਾਨ ਰਿਕਾਰਡ' : 'Unpaid Records'}</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--chalk-100)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {outstandingDetailPlayer.record_count}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
              {outstandingDetailPlayer.all_records.map((rec) => {
                const minutes = rec.time_played_minutes || 0;
                return (
                  <div key={rec.session_id} style={styles.outstandingDetailCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ color: 'var(--chalk-100)' }}>{rec.asset_label}</span>
                      <span style={{ color: 'var(--orange-warn)', fontFamily: 'var(--font-mono)' }}>₹{rec.pending_amount.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--chalk-400)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        {new Date(rec.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
                        {new Date(rec.stop_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{minutes} {lang === 'hi' ? 'मिनट' : lang === 'pb' ? 'ਮਿੰਟ' : 'min'}</span>
                    </div>
                    {(rec.food_amount > 0 || rec.time_played_minutes > 0) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: '0.75rem', color: 'var(--chalk-300)' }}>
                        {rec.time_played_minutes > 0 && <span>{lang === 'hi' ? 'खेल' : lang === 'pb' ? 'ਖੇਡ' : 'Game'}: ₹{(rec.total_amount - rec.food_amount).toFixed(0)}</span>}
                        {rec.food_amount > 0 && <span>{t('food')}: ₹{rec.food_amount.toFixed(0)}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                style={{
                  flex: 1,
                  background: 'var(--green-go)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '11px 0',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const playerRecord = outstandingDetailPlayer;
                  setOutstandingDetailPlayer(null);
                  setPaymentMethodPrompt({
                    type: 'all',
                    id: `mark-all-${playerRecord.player_name}`,
                    playerName: playerRecord.player_name,
                    amount: playerRecord.total_outstanding,
                    records: playerRecord.all_records,
                  });
                }}
              >
                {t('markAllPaid')}
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid var(--felt-500)',
                  color: 'var(--chalk-400)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '11px 18px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => setOutstandingDetailPlayer(null)}
              >
                {t('close')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showManualEntry && (
        <ManualEntryModal
          onClose={() => setShowManualEntry(false)}
          onSaved={handleManualSaved}
        />
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function StatPill({ label, value, accent }) {
  const accentColor = {
    brass: 'var(--brass-300)',
    green: 'var(--green-go)',
    orange: 'var(--orange-warn)',
    neutral: 'var(--chalk-200)',
  }[accent];

  return (
    <div style={styles.statPill}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: accentColor }}>{value}</div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <Card style={{ padding: 20 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 18,
            borderRadius: 6,
            background: 'var(--felt-600)',
            marginBottom: 14,
            width: `${85 - i * 8}%`,
            animation: 'shimmerPulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </Card>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M16.5 3.5 20 7l-12 12H4v-4l12.5-11.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
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

function CheckmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
    flexWrap: 'wrap',
    gap: 16,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    color: 'var(--chalk-100)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    margin: '4px 0 0',
  },
  tabNav: {
    display: 'flex',
    gap: 2,
    marginBottom: 22,
    borderBottom: '1px solid var(--felt-600)',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '12px 20px',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    color: 'var(--brass-300)',
    borderBottom: '2px solid var(--brass-300)',
  },
  tabBtnInactive: {
    color: 'var(--chalk-400)',
    borderBottom: '2px solid transparent',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: '0.88rem',
    transition: 'transform 0.12s ease, box-shadow 0.15s ease',
    boxShadow: '0 2px 8px rgba(201, 162, 75, 0.25)',
  },
  plusIcon: { fontSize: '1.05rem', lineHeight: 1, fontWeight: 700 },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14,
    marginBottom: 22,
  },
  statPill: {
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 18px',
  },
  statLabel: {
    fontSize: '0.72rem',
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '13px 16px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--chalk-400)',
    borderBottom: '1px solid var(--felt-600)',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid var(--felt-600)',
    transition: 'background 0.15s ease',
  },
  td: {
    padding: '14px 16px',
    fontSize: '0.88rem',
    color: 'var(--chalk-100)',
    verticalAlign: 'middle',
  },
  tdMono: {
    padding: '14px 16px',
    fontSize: '0.86rem',
    color: 'var(--chalk-200)',
    fontFamily: 'var(--font-mono)',
    verticalAlign: 'middle',
  },
  serial: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--chalk-400)',
    fontSize: '0.85rem',
  },
  playerCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  manualBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: 'var(--brass-300)',
    background: 'rgba(201,162,75,0.15)',
    padding: '2px 7px',
    borderRadius: 999,
  },
  editedBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: 'var(--chalk-400)',
    background: 'rgba(185,175,152,0.12)',
    padding: '2px 7px',
    borderRadius: 999,
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.76rem',
    fontWeight: 600,
    padding: '4px 11px',
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  paidPill: { background: 'rgba(47,158,99,0.16)', color: 'var(--green-go)' },
  unpaidPill: { background: 'rgba(217,123,43,0.16)', color: 'var(--orange-warn)' },
  payBtnRow: { display: 'flex', gap: 6 },
  paidBtn: {
    background: 'var(--green-go)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  unpaidBtn: {
    background: 'var(--orange-warn)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  actionRow: { display: 'flex', gap: 4 },
  iconBtn: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--chalk-400)',
    borderRadius: 'var(--radius-sm)',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  detailLine: { color: 'var(--chalk-200)', fontSize: '0.9rem', marginBottom: 8 },
  foodList: { color: 'var(--chalk-200)', fontSize: '0.88rem', margin: '4px 0 12px' },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    marginBottom: 14,
  },
  saveBtn: {
    width: '100%',
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
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
  toast: {
    position: 'fixed',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--ink-900)',
    color: 'var(--chalk-100)',
    border: '1px solid var(--brass-500)',
    borderRadius: 999,
    padding: '10px 22px',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: 'var(--shadow-raised)',
    animation: 'modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 200,
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 360,
  },
  searchInput: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 36px 10px 12px',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 10,
    background: 'transparent',
    border: 'none',
    color: 'var(--chalk-400)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  outstandingDetailCard: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    textAlign: 'left',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 28,
    width: '100%',
  },
  pageBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-200)',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '0.88rem',
    color: 'var(--chalk-400)',
    fontWeight: 500,
  },
};
