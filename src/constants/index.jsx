// ─── constants/index.js ──────────────────────────────────────────────────────
// Single source of truth for magic numbers, colours, and label maps.

export const REPORT_COOLDOWN_MS = 15_000;
export const ALL_BAYS_PADDING   = 52;
export const SESSION_MAX_HOURS  = 4;

export const STATUS_COLORS = {
  free: '#22c55e',
  paid: '#3b82f6',
  full: '#ef4444',
};

export const REPORT_COLORS = {
  free:     '#22c55e',
  full:     '#ef4444',
  warden:   '#fbbf24',
  blocked:  '#f97316',
  works:    '#a78bfa',
  accident: '#ef4444',
};

export const REPORT_LABELS = {
  free:     'Spot free',
  full:     'No space',
  warden:   'Warden nearby',
  blocked:  'Bay blocked',
  works:    'Roadworks',
  accident: 'Accident',
};

export const DURATION_OPTIONS = [30, 60, 90, 120, 180];
