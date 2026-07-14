import { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useTranslation } from '../utils/translations';
import { brandingApi } from '../api/endpoints';
import Card from '../components/Card';

const PRESETS = [
  { nameKey: 'presetEmerald', primary: '#0b2b22', secondary: '#c9a24b' },
  { nameKey: 'presetSapphire', primary: '#0f172a', secondary: '#f59e0b' },
  { nameKey: 'presetBurgundy', primary: '#3b080f', secondary: '#d9a05b' },
  { nameKey: 'presetTeal', primary: '#0d1e1c', secondary: '#06b6d4' },
  { nameKey: 'presetAmethyst', primary: '#1e112a', secondary: '#a855f7' },
  { nameKey: 'presetEucalyptus', primary: '#0d241f', secondary: '#10b981' },
];

export default function Settings() {
  const { theme_primary, theme_secondary, language, updateBranding } = useBranding();
  const { t } = useTranslation();

  const [primaryColor, setPrimaryColor] = useState(theme_primary || '#0b2b22');
  const [secondaryColor, setSecondaryColor] = useState(theme_secondary || '#c9a24b');
  const [selectedLang, setSelectedLang] = useState(language || 'en');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Sync state if branding loads late
  useEffect(() => {
    if (theme_primary) setPrimaryColor(theme_primary);
    if (theme_secondary) setSecondaryColor(theme_secondary);
    if (language) setSelectedLang(language);
  }, [theme_primary, theme_secondary, language]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const handlePresetSelect = (primary, secondary) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await brandingApi.updateSettings({
        themePrimary: primaryColor,
        themeSecondary: secondaryColor,
        language: selectedLang,
      });

      // Update Branding Context state dynamically
      if (updateBranding) {
        updateBranding({
          theme_primary: primaryColor,
          theme_secondary: secondaryColor,
          language: selectedLang,
        });
      }

      setToast(t('settingsSaved'));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || t('errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>{t('settingsTitle')}</h1>
          <p style={styles.subtitle}>{t('settingsSubtitle')}</p>
        </div>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.layout}>
        <div style={styles.mainCol}>
          <form onSubmit={handleSave}>
            {/* Section 1: Theme Preferences */}
            <Card style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>{t('themeSection')}</h2>
              
              <div style={styles.colorPickersContainer}>
                <div style={styles.pickerField}>
                  <label style={styles.label}>{t('themePrimary')}</label>
                  <div style={styles.pickerWrapper} title="Choose primary color">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={styles.colorInput}
                      className="settings-color-picker"
                    />
                  </div>
                </div>

                <div style={styles.pickerField}>
                  <label style={styles.label}>{t('themeSecondary')}</label>
                  <div style={styles.pickerWrapper} title="Choose secondary color">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      style={styles.colorInput}
                      className="settings-color-picker"
                    />
                  </div>
                </div>
              </div>

              {/* Preset Color Themes */}
              <div style={styles.presetsBlock}>
                <h3 style={styles.presetsTitle}>{t('choosePreset')}</h3>
                <div style={styles.presetsGrid}>
                  {PRESETS.map((p) => {
                    const isSelected = primaryColor === p.primary && secondaryColor === p.secondary;
                    return (
                      <button
                        key={p.nameKey}
                        type="button"
                        onClick={() => handlePresetSelect(p.primary, p.secondary)}
                        style={{
                          ...styles.presetButton,
                          borderColor: isSelected ? 'var(--brass-300)' : 'transparent',
                          backgroundColor: 'var(--felt-800)',
                        }}
                      >
                        <div style={styles.presetColorPreview}>
                          <span style={{ ...styles.colorSwatch, backgroundColor: p.primary }} />
                          <span style={{ ...styles.colorSwatch, backgroundColor: p.secondary }} />
                        </div>
                        <span style={styles.presetName}>{t(p.nameKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Section 2: Language Selection */}
            <Card style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>{t('languageSection')}</h2>
              <div style={styles.field}>
                <label style={styles.label}>{t('selectLanguage')}</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="en">{t('english')}</option>
                  <option value="hi">{t('hindi')}</option>
                  <option value="pb">{t('punjabi')}</option>
                </select>
              </div>
            </Card>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.saveBtn,
                opacity: saving ? 0.75 : 1,
              }}
            >
              {saving ? t('saving') : t('saveSettings')}
            </button>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div style={styles.previewCol}>
          <Card style={styles.previewCard}>
            <h3 style={styles.previewTitle}>Live Preview</h3>
            <p style={styles.previewDesc}>This is a visual preview of how colors apply to UI elements.</p>
            
            <div style={{ ...styles.demoBox, backgroundColor: primaryColor }}>
              <div style={{ ...styles.demoTopbar, backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
                <span style={{ ...styles.demoText, color: secondaryColor, fontWeight: 700 }}>Arena Dashboard</span>
                <span style={styles.demoRole}>Club Owner</span>
              </div>
              <div style={styles.demoContent}>
                <div style={{ ...styles.demoCard, backgroundColor: 'rgba(255, 255, 255, 0.08)', border: `1px solid ${secondaryColor}33` }}>
                  <div style={{ color: secondaryColor, fontSize: '0.8rem', fontWeight: 600 }}>Table 1 (Heyball)</div>
                  <div style={{ fontSize: '1rem', marginTop: 4 }}>01:14:45</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Current bill: ₹220</div>
                </div>

                <div style={{ ...styles.demoBtn, backgroundColor: secondaryColor, color: primaryColor === '#ffffff' ? '#000000' : '#ffffff' }}>
                  Start Session
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: 28,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.2rem',
    fontWeight: 700,
    color: 'var(--brass-300)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--chalk-400)',
    margin: '6px 0 0 0',
  },
  layout: {
    display: 'flex',
    gap: 28,
    flexWrap: 'wrap',
  },
  mainCol: {
    flex: '1 1 500px',
  },
  previewCol: {
    flex: '1 1 300px',
    maxWidth: 360,
  },
  sectionCard: {
    marginBottom: 20,
    padding: 24,
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: 'var(--chalk-100)',
    borderBottom: '1px solid var(--felt-600)',
    paddingBottom: 12,
    marginTop: 0,
    marginBottom: 20,
  },
  colorPickersContainer: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  pickerField: {
    flex: 1,
    minWidth: 180,
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--chalk-200)',
    marginBottom: 8,
  },
  pickerWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 58,
    borderRadius: '50%',
    padding: 3,
    background: 'var(--felt-800)',
    border: '2px solid var(--felt-600)',
    boxShadow: 'var(--shadow-card)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  colorInput: {
    border: 'none',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    cursor: 'pointer',
    background: 'transparent',
    padding: 0,
    outline: 'none',
  },
  presetsBlock: {
    marginTop: 24,
    paddingTop: 20,
    borderTop: '1px solid var(--felt-600)',
  },
  presetsTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--chalk-200)',
    marginTop: 0,
    marginBottom: 12,
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 10,
  },
  presetButton: {
    border: '2px solid transparent',
    borderRadius: 'var(--radius-sm)',
    padding: 10,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  presetColorPreview: {
    display: 'flex',
    gap: 4,
    marginBottom: 6,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'inline-block',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  presetName: {
    fontSize: '0.75rem',
    color: 'var(--chalk-200)',
    fontWeight: 500,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  selectInput: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    color: 'var(--chalk-100)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    outline: 'none',
  },
  saveBtn: {
    width: '100%',
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '14px 0',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 4px 12px rgba(201, 162, 75, 0.25)',
  },
  previewCard: {
    padding: 20,
    position: 'sticky',
    top: 28,
  },
  previewTitle: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: 'var(--brass-300)',
    marginTop: 0,
    marginBottom: 8,
  },
  previewDesc: {
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginTop: 0,
    marginBottom: 16,
    lineHeight: 1.4,
  },
  demoBox: {
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--felt-600)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.3)',
    aspectRatio: '4 / 3',
    display: 'flex',
    flexDirection: 'column',
  },
  demoTopbar: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    alignItems: 'center',
  },
  demoText: {
    fontSize: '0.75rem',
  },
  demoRole: {
    fontSize: '0.6rem',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },
  demoContent: {
    flex: 1,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  demoCard: {
    borderRadius: 'var(--radius-sm)',
    padding: 10,
  },
  demoBtn: {
    borderRadius: 'var(--radius-sm)',
    padding: '8px 0',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  error: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: '0.9rem',
    marginBottom: 20,
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
    padding: '12px 20px',
    fontSize: '0.9rem',
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
};
