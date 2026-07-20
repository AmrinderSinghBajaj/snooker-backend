import { useState } from 'react';

export default function TimePresetPicker({ value, onChange, label = 'Start time' }) {
  const [activePreset, setActivePreset] = useState('now'); // 'now' | '10' | '15' | '30' | '60' | 'custom'

  const formatHHMM = (d) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const applyPreset = (minutesAgo, presetKey) => {
    setActivePreset(presetKey);
    const d = new Date(Date.now() - minutesAgo * 60000);
    onChange(formatHHMM(d));
  };

  const handleCustomChange = (e) => {
    setActivePreset('custom');
    onChange(e.target.value);
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <span style={styles.label}>{label}</span>
        <span style={styles.selectedTimeDisplay}>
          🕒 {value || '--:--'}
        </span>
      </div>

      <div style={styles.presetsGrid}>
        <button
          type="button"
          style={{
            ...styles.presetBtn,
            ...(activePreset === 'now' ? styles.presetActive : {}),
          }}
          onClick={() => applyPreset(0, 'now')}
        >
          📍 Right Now
        </button>
        <button
          type="button"
          style={{
            ...styles.presetBtn,
            ...(activePreset === '10' ? styles.presetActive : {}),
          }}
          onClick={() => applyPreset(10, '10')}
        >
          10m ago
        </button>
        <button
          type="button"
          style={{
            ...styles.presetBtn,
            ...(activePreset === '15' ? styles.presetActive : {}),
          }}
          onClick={() => applyPreset(15, '15')}
        >
          15m ago
        </button>
        <button
          type="button"
          style={{
            ...styles.presetBtn,
            ...(activePreset === '30' ? styles.presetActive : {}),
          }}
          onClick={() => applyPreset(30, '30')}
        >
          30m ago
        </button>
        <button
          type="button"
          style={{
            ...styles.presetBtn,
            ...(activePreset === '60' ? styles.presetActive : {}),
          }}
          onClick={() => applyPreset(60, '60')}
        >
          1h ago
        </button>
      </div>

      <div style={styles.customRow}>
        <span style={styles.customLabel}>Or pick custom time:</span>
        <input
          type="time"
          style={styles.timeInput}
          value={value}
          onChange={handleCustomChange}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    marginBottom: 16,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: '0.82rem',
    color: 'var(--chalk-400)',
    fontWeight: 600,
  },
  selectedTimeDisplay: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--brass-300)',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 6,
    marginBottom: 10,
  },
  presetBtn: {
    background: 'var(--felt-900)',
    border: '1px solid var(--felt-600)',
    color: 'var(--chalk-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '7px 4px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  },
  presetActive: {
    background: 'rgba(201, 162, 75, 0.2)',
    borderColor: 'var(--brass-500)',
    color: 'var(--brass-300)',
    fontWeight: 700,
  },
  customRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTop: '1px dashed var(--felt-600)',
  },
  customLabel: {
    fontSize: '0.78rem',
    color: 'var(--chalk-400)',
  },
  timeInput: {
    colorScheme: 'dark',
    background: 'var(--felt-900)',
    border: '1px solid var(--brass-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '6px 10px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  },
};
