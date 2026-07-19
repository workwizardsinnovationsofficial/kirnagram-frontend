export const getRelativeTimeLabel = (dateString: string, now: Date = new Date()) => {
  try {
    const rawValue = String(dateString || '').trim();
    // Backend often returns UTC datetimes without timezone suffix (e.g. 2026-07-19T12:34:56.789).
    // Treat those as UTC explicitly so clients in non-UTC timezones don't see inflated "x h ago" values.
    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(rawValue);
    const normalizedValue = !hasTimezone && /^\d{4}-\d{2}-\d{2}T/.test(rawValue)
      ? `${rawValue}Z`
      : rawValue;

    const createdAt = new Date(normalizedValue);
    if (Number.isNaN(createdAt.getTime())) {
      return 'Just now';
    }

    const diffMs = now.getTime() - createdAt.getTime();
    if (diffMs <= 0) {
      return 'Just now';
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMinutes < 1) {
      return 'Just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    if (diffHours < 24) {
      return `${Math.max(diffHours, 1)}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1d ago' : `${diffDays}d ago`;
  } catch (error) {
    return 'Just now';
  }
};
