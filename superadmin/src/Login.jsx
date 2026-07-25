import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const styleSheet = `
  @keyframes pulseGlow {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(201, 162, 75, 0.5)); transform: scale(1); }
    50% { filter: drop-shadow(0 0 18px rgba(227, 200, 120, 0.85)); transform: scale(1.04); }
  }
  .focus-ring:focus {
    border-color: var(--brass-500) !important;
    box-shadow: 0 0 0 2px rgba(201, 162, 75, 0.15) !important;
  }
`;

const CrownSVG = () => (
  <svg 
    width="72" 
    height="72" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{
      animation: 'pulseGlow 4s infinite ease-in-out',
      marginBottom: 20,
    }}
  >
    <path 
      d="M2 4.5L6 12L12 6.5L18 12L22 4.5L18 18H6L2 4.5Z" 
      fill="url(#goldGradient)" 
      stroke="var(--brass-300)" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="2" cy="4.5" r="0.8" fill="#fff" />
    <circle cx="12" cy="6.5" r="1" fill="#fff" />
    <circle cx="22" cy="4.5" r="0.8" fill="#fff" />
    <circle cx="6" cy="18" r="0.6" fill="var(--brass-300)" />
    <circle cx="12" cy="18" r="0.6" fill="var(--brass-300)" />
    <circle cx="18" cy="18" r="0.6" fill="var(--brass-300)" />
    <defs>
      <linearGradient id="goldGradient" x1="2" y1="4.5" x2="22" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c9a24b" />
        <stop offset="50%" stopColor="#e3c878" />
        <stop offset="100%" stopColor="#9a762b" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particleCount = 45;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.15,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw faint connections
      ctx.strokeStyle = 'rgba(201, 162, 75, 0.025)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < particleCount; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw floating gold dust particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        ctx.fillStyle = `rgba(227, 200, 120, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(
        err.message || err.response?.data?.detail || 'Could not sign in. Check credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{styleSheet}</style>

      {/* Left panel: Premium interactive branding */}
      <div style={styles.leftHalf}>
        <canvas ref={canvasRef} style={styles.particleCanvas} />
        <div style={styles.brandingBox}>
          <CrownSVG />
          <h1 style={styles.title}>Super Admin</h1>
          <p style={styles.subtitle}>Enterprise Control & Operations</p>
          <span style={styles.divider}></span>
          <p style={styles.domain}>bajajsnooker.shop</p>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div style={styles.rightHalf}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <span style={styles.eyebrow}>Platform Owner Access</span>
          <h2 style={styles.formTitle}>Sign in</h2>

          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label} htmlFor="username">Username</label>
          <input
            id="username"
            className="focus-ring"
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label style={styles.label} htmlFor="password">Password</label>
          <div style={styles.inputContainer}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="focus-ring"
              style={styles.passwordInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    background: 'var(--felt-900)',
    overflow: 'hidden',
  },
  leftHalf: {
    flex: '1.2',
    position: 'relative',
    background: 'radial-gradient(circle at center, var(--felt-800) 0%, var(--felt-900) 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid var(--felt-700)',
    padding: '40px',
    textAlign: 'center',
  },
  particleCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 1,
  },
  brandingBox: {
    background: 'rgba(255, 255, 255, 0.025)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 'var(--radius-lg)',
    padding: '48px 40px',
    maxWidth: 380,
    width: '100%',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.5rem',
    color: 'var(--brass-300)',
    margin: '0 0 8px 0',
    fontWeight: 700,
    letterSpacing: '0.01em',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: 'var(--chalk-300)',
    margin: 0,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  divider: {
    display: 'block',
    width: 60,
    height: 1,
    background: 'linear-gradient(to right, transparent, var(--brass-500), transparent)',
    margin: '24px auto',
    opacity: 0.6,
  },
  domain: {
    fontSize: '0.88rem',
    color: 'var(--chalk-400)',
    margin: 0,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.05em',
  },
  rightHalf: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--felt-800)',
    padding: '40px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: 340,
  },
  eyebrow: {
    fontSize: '0.72rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--brass-500)',
    fontWeight: 600,
  },
  formTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    color: 'var(--chalk-100)',
    margin: '6px 0 28px',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginBottom: 6,
    fontWeight: 500,
  },
  input: {
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '11px 14px',
    fontSize: '0.95rem',
    marginBottom: 18,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 18,
  },
  passwordInput: {
    width: '100%',
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '11px 54px 11px 14px',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--brass-500)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    outline: 'none',
  },
  submitBtn: {
    marginTop: 8,
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
    transition: 'background 0.2s ease',
  },
  error: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: '0.85rem',
    marginBottom: 16,
  },
};
