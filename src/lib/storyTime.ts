export const getRelativeTimeLabel = (dateString: string, now: Date = new Date()) => {
  try {
    const createdAt = new Date(dateString);
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

    if (diffHours > 24) {
      return '24h ago';
    }

    return `${Math.max(diffHours, 1)}h ago`;
  } catch (error) {
    return 'Just now';
  }
};
