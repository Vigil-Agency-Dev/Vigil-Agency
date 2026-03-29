// VIGIL Agency — Date formatting utilities
// All dates displayed in Australian Eastern Time (AEST/AEDT)

const AEST_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'Australia/Melbourne',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

const AEST_SHORT: Intl.DateTimeFormatOptions = {
  timeZone: 'Australia/Melbourne',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

const AEST_TIME_ONLY: Intl.DateTimeFormatOptions = {
  timeZone: 'Australia/Melbourne',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

const AEST_DATE_ONLY: Intl.DateTimeFormatOptions = {
  timeZone: 'Australia/Melbourne',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

/**
 * Format a date/timestamp string to Australian Eastern Time
 * Returns: "28 Mar 2026, 14:30"
 */
export function formatAEST(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-AU', AEST_OPTIONS);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format short: "28 Mar, 14:30"
 */
export function formatAESTShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-AU', AEST_SHORT);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format time only: "14:30"
 */
export function formatAESTTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-AU', AEST_TIME_ONLY);
  } catch {
    return '';
  }
}

/**
 * Format date only: "28 Mar 2026"
 */
export function formatAESTDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-AU', AEST_DATE_ONLY);
  } catch {
    return String(dateStr);
  }
}

/**
 * Relative time: "5m ago", "3h ago", "2d ago"
 */
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 0) return 'just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}
