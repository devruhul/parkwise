// ─── utils/storage.js ─────────────────────────────────────────────────────────
// Best-effort local storage wrappers. Fail silently — app works without them.

const KEY = 'parkwise_reports';

export const getStoredReports = () => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveStoredReports = (reports) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(reports.slice(-50)));
  } catch {
    // Storage unavailable — continue without persistence.
  }
};
