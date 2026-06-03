// ─── utils/storage.js ─────────────────────────────────────────────────────────
// Best-effort local storage wrappers. Fail silently — app works without them.

const REPORTS_KEY = 'parkwise_reports';
const SAVED_BAYS_KEY = 'parkwise_saved_bays';
const RECENT_BAYS_KEY = 'parkwise_recent_bays';
const SESSION_KEY = 'parkwise_active_session';

export const getStoredReports = () => {
  try {
    return JSON.parse(window.localStorage.getItem(REPORTS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveStoredReports = (reports) => {
  try {
    window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(-50)));
  } catch {
    // Storage unavailable — continue without persistence.
  }
};

export const getStoredSavedBays = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SAVED_BAYS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveStoredSavedBays = (bays) => {
  try {
    window.localStorage.setItem(SAVED_BAYS_KEY, JSON.stringify(bays.slice(0, 30)));
  } catch {
    // Storage unavailable — continue without persistence.
  }
};

export const getStoredRecentBays = () => {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_BAYS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveStoredRecentBays = (bays) => {
  try {
    window.localStorage.setItem(RECENT_BAYS_KEY, JSON.stringify(bays.slice(0, 20)));
  } catch {
    // Storage unavailable — continue without persistence.
  }
};

export const getStoredSession = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};

export const saveStoredSession = (session) => {
  try {
    if (!session) {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable — continue without persistence.
  }
};
