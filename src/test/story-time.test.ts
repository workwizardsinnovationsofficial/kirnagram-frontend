import { describe, expect, it } from 'vitest';
import { getRelativeTimeLabel } from '@/lib/storyTime';

describe('getRelativeTimeLabel', () => {
  it('formats recent stories in hours and keeps the label human-readable', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    expect(getRelativeTimeLabel('2024-01-01T11:30:00.000Z', now)).toBe('30m ago');
    expect(getRelativeTimeLabel('2024-01-01T10:00:00.000Z', now)).toBe('2h ago');
    expect(getRelativeTimeLabel('2024-01-01T08:00:00.000Z', now)).toBe('4h ago');
  });

  it('uses a 24-hour label once the story is older than a day', () => {
    const now = new Date('2024-01-02T12:00:00.000Z');
    expect(getRelativeTimeLabel('2023-12-31T12:00:00.000Z', now)).toBe('24h ago');
  });
});
