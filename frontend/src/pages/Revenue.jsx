import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { revenueApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useTranslation } from '../utils/translations';

function ProgressCircle({ value, target = 2000, color }) {
  const pct = Math.min((value / target) * 100, 100);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const strokeOffset = circ - (pct / 100) * circ;

  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track circle */}
        <circle
          cx={70}
          cy={70}
          r={r}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={8}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={70}
          cy={70}
          r={r}
          stroke={color}
          strokeWidth={8}
          fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--chalk-400)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Target</span>
        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--chalk-100)', fontFamily: 'var(--font-mono)' }}>{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

export default function Revenue() {
  const { t, lang } = useTranslation();
  const [today, setToday] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dayDrill, setDayDrill] = useState(null);
  const [weekDrill, setWeekDrill] = useState(null);
  const [monthDrill, setMonthDrill] = useState(null);

  const [searchDate, setSearchDate] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeResult, setRangeResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([revenueApi.today(), revenueApi.weekly(), revenueApi.monthly()])
      .then(([t, w, m]) => {
        setToday(t.data);
        setWeekly(w.data);
        setMonthly(m.data);
      })
      .catch(() => setError(t('errorLoading')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const openDayDrilldown = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await revenueApi.drilldownDay(todayStr);
      setDayDrill(res.data);
    } catch {
      setError(t('couldNotFetchDrilldown'));
    }
  };

  const openWeekDrilldown = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await revenueApi.drilldownWeek(todayStr);
      setWeekDrill(res.data);
    } catch {
      setError(t('couldNotFetchDrilldown'));
    }
  };

  const openMonthDrilldown = async () => {
    try {
      const now = new Date();
      const res = await revenueApi.drilldownMonth(now.getFullYear(), now.getMonth() + 1);
      setMonthDrill(res.data);
    } catch {
      setError(t('couldNotFetchDrilldown'));
    }
  };

  const handleDateSearch = async () => {
    if (!searchDate) return;
    try {
      const res = await revenueApi.searchDate(searchDate);
      setSearchResult(res.data);
    } catch {
      setError(t('searchQueryFailed'));
    }
  };

  const handleRangeSearch = async () => {
    if (!rangeStart || !rangeEnd) return;
    try {
      const res = await revenueApi.searchRange(rangeStart, rangeEnd);
      setRangeResult(res.data);
    } catch {
      setError(t('rangeQueryFailed'));
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>{t('revenueAnalytics')}</h1>
        <div style={styles.donutRow}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
        <div style={styles.searchRow}>
          {[1, 2].map((n) => (
            <div key={n} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  const todayColor = today?.is_above_threshold ? 'var(--green-go)' : 'var(--brass-500)';
  
  const weeklyChartData = weekly?.slices.map((s) => ({
    name: s.label.slice(0, 3),
    value: s.value,
    fullDay: s.label,
  })) || [];

  const targetMonthly = 50000;
  const pctMonth = Math.min(((monthly?.total || 0) / targetMonthly) * 100, 100);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>{t('revenueAnalytics')}</h1>
        <p style={styles.subtitle}>{t('trackClubEarnings')}</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.donutRow}>
        {/* Today Card */}
        <Card style={styles.donutCard} onClick={openDayDrilldown}>
          <h3 style={styles.donutTitle}>{t('today')}</h3>
          <ProgressCircle value={today?.total || 0} target={today?.threshold || 2000} color={todayColor} />
          <div style={{ ...styles.donutValue, color: todayColor }}>₹{(today?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div style={styles.donutHint}>{t('clickForTodayTx')}</div>
        </Card>

        {/* Weekly Area Card */}
        <Card style={styles.donutCard} onClick={openWeekDrilldown}>
          <h3 style={styles.donutTitle}>{t('thisWeek')}</h3>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brass-300)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--brass-300)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--chalk-400)" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--chalk-400)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={styles.customTooltip}>
                          <div style={styles.tooltipLabel}>{payload[0].payload.fullDay}</div>
                          <div style={styles.tooltipValue}>₹{payload[0].value.toFixed(2)}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--brass-300)" strokeWidth={2} fillOpacity={1} fill="url(#weekGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.donutValue}>₹{(weekly?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div style={styles.donutHint}>{t('clickForDailyBreakdown')}</div>
        </Card>

        {/* Monthly Card */}
        <Card style={styles.donutCard} onClick={openMonthDrilldown}>
          <h3 style={styles.donutTitle}>{monthly?.month_label || t('thisMonth')}</h3>
          <div style={styles.monthGaugeWrapper}>
            <div style={styles.monthProgressHeader}>
              <span style={styles.monthProgressLabel}>{t('monthlyTarget')}</span>
              <span style={styles.monthProgressValue}>{Math.round(pctMonth)}% (₹50K)</span>
            </div>
            <div style={styles.monthProgressBarOuter}>
              <div style={{ ...styles.monthProgressBarInner, width: `${pctMonth}%` }} />
            </div>
          </div>
          <div style={{ ...styles.donutValue, color: 'var(--brass-300)', marginTop: 8 }}>₹{(monthly?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div style={styles.donutHint}>{t('clickForCalendarBreakdown')}</div>
        </Card>
      </div>

      <div style={styles.searchRow}>
        {/* Search by Date */}
        <Card style={styles.searchCard}>
          <h3 style={styles.searchTitle}>{t('searchByDate')}</h3>
          <div style={styles.searchForm}>
            <input type="date" style={styles.input} value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
            <button style={styles.searchBtn} onClick={handleDateSearch}>{t('searchDate')}</button>
          </div>
          {searchResult && (
            <div style={styles.resultBox}>
              {searchResult.transactions.length === 0 ? (
                <p style={styles.resultEmpty}>{t('noTransactionsOnDate')}</p>
              ) : (
                <div style={styles.transactionList}>
                  {searchResult.transactions.map((t, i) => (
                    <div key={i} style={styles.transactionLine}>
                      <span style={styles.txSerial}>#{t.serial_number}</span>
                      <span style={styles.txPlayers}>
                        {t.player_names.join(', ')}
                        {t.payment_method && (
                          <span style={styles.paymentMethodBadge}>
                            {t.payment_method}
                          </span>
                        )}
                      </span>
                      <span style={styles.txAmount}>₹{t.total_amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Search by Range */}
        <Card style={styles.searchCard}>
          <h3 style={styles.searchTitle}>{t('searchByDateRange')}</h3>
          <div style={styles.searchForm}>
            <div style={styles.rangeRow}>
              <input type="date" style={styles.inputHalf} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
              <input type="date" style={styles.inputHalf} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
            <button style={styles.searchBtn} onClick={handleRangeSearch}>{t('searchRange')}</button>
          </div>
          {rangeResult && (
            <div style={styles.resultBox}>
              <div style={styles.rangeTotalRow}>
                <span style={styles.rangeTotalLabel}>{t('totalRevenue')}</span>
                <span style={styles.rangeTotalValue}>₹{rangeResult.total_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {rangeResult.due_bills.length > 0 && (
                <div style={styles.dueSection}>
                  <div style={styles.dueTitle}>{t('outstandingTab')}:</div>
                  <div style={styles.dueList}>
                    {rangeResult.due_bills.map((b, i) => (
                      <div key={i} style={styles.transactionLine}>
                        <span style={styles.txSerial}>#{b.serial_number}</span>
                        <span style={styles.txPlayers}>{b.player_names.join(', ')}</span>
                        <span style={{ ...styles.txAmount, color: 'var(--orange-warn)' }}>₹{b.pending_amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Drilldown Modals */}
      {dayDrill && (
        <Modal title={`${t('todaysTransactions')} — ${dayDrill.date}`} onClose={() => setDayDrill(null)}>
          {dayDrill.transactions.length === 0 ? (
            <p style={{ color: 'var(--chalk-400)' }}>{lang === 'hi' ? 'आज कोई लेनदेन नहीं हुआ।' : lang === 'pb' ? 'ਅੱਜ ਕੋਈ ਲੈਣ-ਦੇਣ ਨਹੀਂ ਹੋਇਆ।' : 'No transactions yet today.'}</p>
          ) : (
            <div style={styles.modalTxList}>
              {dayDrill.transactions.map((t, i) => (
                <div key={i} style={styles.modalTxLine}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ color: 'var(--brass-300)' }}>#{t.serial_number}</strong>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{t.total_amount.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--chalk-400)' }}>
                    {t.player_names.join(', ')} • {t.time_played_minutes} {lang === 'hi' ? 'मिनट खेले' : lang === 'pb' ? 'ਮਿੰਟ ਖੇਡੇ' : 'mins played'}
                    {t.payment_method && (
                      <span style={{ marginLeft: 6, color: t.payment_method === 'online' ? '#818CF8' : 'var(--brass-300)', fontWeight: 600, textTransform: 'capitalize' }}>
                        • {t.payment_method}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {weekDrill && (
        <Modal title={`${t('thisWeek')}: ${weekDrill.start_date} – ${weekDrill.end_date}`} onClose={() => setWeekDrill(null)}>
          <div style={styles.modalTxList}>
            {weekDrill.daily_totals.map((d, i) => (
              <div key={i} style={{ ...styles.modalTxLine, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, background: d.color, borderRadius: '50%' }} />
                  <span>{d.label}</span>
                </div>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{d.value.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {monthDrill && (
        <Modal title={`${lang === 'hi' ? 'दैनिक कैलेंडर विवरण' : lang === 'pb' ? 'ਰੋਜ਼ਾਨਾ ਕੈਲੰਡਰ ਵੇਰਵਾ' : 'Daily Breakdown'} — ${monthDrill.month_label}`} onClose={() => setMonthDrill(null)} width={540}>
          <div style={styles.monthGrid}>
            {monthDrill.daily_totals.map((d, i) => {
              const hasEarning = d.value > 0;
              return (
                <div
                  key={i}
                  className="month-cell-hover"
                  style={{
                    ...styles.monthCell,
                    background: hasEarning ? 'rgba(201,162,75,0.06)' : 'rgba(255,255,255,0.01)',
                    borderColor: hasEarning ? 'rgba(201,162,75,0.2)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={styles.monthDay}>{d.label}</div>
                  <div style={{ ...styles.monthValue, color: hasEarning ? 'var(--brass-300)' : 'var(--chalk-400)' }}>
                    ₹{d.value.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  page: { position: 'relative', paddingBottom: 48 },
  header: { marginBottom: 28 },
  pageTitle: { fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--chalk-100)', margin: 0, letterSpacing: '-0.01em' },
  subtitle: { color: 'var(--chalk-400)', margin: '6px 0 0', fontSize: '0.92rem' },
  donutRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
    marginBottom: 28,
  },
  donutCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    animation: 'cardEntrance 0.35s ease both',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  donutTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    color: 'var(--brass-300)',
    margin: 0,
    fontWeight: 600,
  },
  donutValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--chalk-100)',
  },
  donutHint: {
    fontSize: '0.72rem',
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 500,
  },
  chartWrapper: {
    height: 140,
    width: '100%',
    margin: '4px 0',
  },
  monthGaugeWrapper: {
    height: 140,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 12px',
  },
  monthProgressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    marginBottom: 8,
    color: 'var(--chalk-300)',
  },
  monthProgressLabel: { fontWeight: 500 },
  monthProgressValue: { fontFamily: 'var(--font-mono)', color: 'var(--brass-300)' },
  monthProgressBarOuter: {
    height: 8,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  monthProgressBarInner: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--brass-500) 0%, var(--brass-300) 100%)',
    borderRadius: 4,
    transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
  },
  customTooltip: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  tooltipLabel: {
    fontSize: '0.72rem',
    color: 'var(--chalk-400)',
    marginBottom: 2,
    fontWeight: 500,
  },
  tooltipValue: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--brass-300)',
    fontFamily: 'var(--font-mono)',
  },
  searchRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  searchCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    animation: 'cardEntrance 0.35s ease both 0.1s',
  },
  searchTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    color: 'var(--brass-300)',
    margin: '0 0 16px',
    fontWeight: 600,
  },
  searchForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '11px 14px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputHalf: {
    flex: 1,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '11px 14px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  rangeRow: { display: 'flex', gap: 12 },
  searchBtn: {
    width: '100%',
    background: 'rgba(201, 162, 75, 0.18)',
    color: 'var(--brass-300)',
    border: '1px solid rgba(201, 162, 75, 0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 0',
    fontWeight: 700,
    fontSize: '0.88rem',
    transition: 'all 0.2s',
  },
  resultBox: {
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  resultEmpty: { color: 'var(--chalk-400)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '12px 0' },
  transactionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  transactionLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
  },
  txSerial: {
    fontWeight: 700,
    color: 'var(--brass-300)',
    fontFamily: 'var(--font-mono)',
  },
  txPlayers: {
    flex: 1,
    paddingLeft: 12,
    color: 'var(--chalk-200)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  txAmount: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    color: 'var(--chalk-100)',
  },
  rangeTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  rangeTotalLabel: { fontSize: '0.9rem', color: 'var(--chalk-300)', fontWeight: 500 },
  rangeTotalValue: { fontSize: '1.25rem', color: 'var(--brass-300)', fontFamily: 'var(--font-mono)', fontWeight: 700 },
  dueSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  dueTitle: {
    fontSize: '0.75rem',
    color: 'var(--orange-warn)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  dueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  modalTxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
  },
  modalTxLine: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 8,
    marginTop: 8,
  },
  monthCell: {
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 4px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  monthDay: { fontSize: '0.7rem', color: 'var(--chalk-400)' },
  monthValue: { fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600 },
  errorBanner: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: 20,
  },
  paymentMethodBadge: {
    fontSize: '0.62rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: 'var(--brass-300)',
    background: 'rgba(201,162,75,0.12)',
    padding: '2px 6px',
    borderRadius: 4,
    marginLeft: 8,
    display: 'inline-block',
  },
};
