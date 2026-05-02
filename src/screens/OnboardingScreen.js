import React, { useEffect, useState } from 'react';

const styles = {
  container: {
    width: 390,
    height: 844,
    background: '#0d1117',
    borderRadius: 44,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '60px 32px 48px',
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
  },
  glow: {
    position: 'absolute',
    top: -100,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  topSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    zIndex: 1,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    fontSize: 36,
  },
  tagline: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    color: '#22c55e',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 38,
    fontWeight: 700,
    color: '#e6edf3',
    textAlign: 'center',
    lineHeight: 1.15,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 16,
    color: '#8b949e',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    zIndex: 1,
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    flexShrink: 0,
  },
  featureText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: '#c9d1d9',
    fontWeight: 500,
  },
  featureSub: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#484f58',
    marginTop: 2,
  },
  bottomSection: {
    width: '100%',
    zIndex: 1,
  },
  btn: {
    width: '100%',
    padding: '16px',
    background: '#22c55e',
    border: 'none',
    borderRadius: 16,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 17,
    fontWeight: 700,
    color: '#052e16',
    cursor: 'pointer',
    transition: 'transform 0.15s, background 0.15s',
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#484f58',
    textAlign: 'center',
    marginTop: 14,
  },
};

const FEATURES = [
  { icon: '🗺️', bg: 'rgba(59,130,246,0.15)', label: 'Live parking map', sub: 'See free & paid bays in real time' },
  { icon: '💷', bg: 'rgba(251,191,36,0.15)', label: 'Price per hour', sub: 'Compare before you drive there' },
  { icon: '🚓', bg: 'rgba(239,68,68,0.15)', label: 'Community reports', sub: 'Warden alerts, accidents & more' },
  { icon: '⭐', bg: 'rgba(34,197,94,0.15)', label: 'Earn points', sub: 'Rewards for helping other drivers' },
];

export default function OnboardingScreen({ onStart }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  return (
    <div style={{ ...styles.container, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.5s, transform 0.5s' }}>
      <div style={styles.glow} />

      <div style={styles.topSection}>
        <div style={styles.iconWrap}>🅿️</div>
        <div style={styles.tagline}>London · Real-time</div>
        <div style={styles.title}>Find parking{'\n'}faster.</div>
        <div style={styles.subtitle}>Community-powered parking for London drivers.</div>
      </div>

      <div style={styles.featureList}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{ ...styles.feature, animationDelay: `${i * 0.1}s` }}>
            <div style={{ ...styles.featureIcon, background: f.bg }}>{f.icon}</div>
            <div>
              <div style={styles.featureText}>{f.label}</div>
              <div style={styles.featureSub}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.bottomSection}>
        <button
          style={styles.btn}
          onMouseEnter={e => e.target.style.background = '#16a34a'}
          onMouseLeave={e => e.target.style.background = '#22c55e'}
          onClick={onStart}
        >
          Get Started →
        </button>
        <div style={styles.disclaimer}>Tower Hamlets · E1, E2, E3 · Beta</div>
      </div>
    </div>
  );
}
