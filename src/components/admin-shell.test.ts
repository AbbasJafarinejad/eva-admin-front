import { describe, it, expect } from 'vitest';
import { getNavItems } from './admin-shell';

describe('admin nav', () => {
  it('contains expected sections', () => {
    const items = getNavItems();
    const labels = items.map((i) => i.label);
    expect(labels).toContain('نمای کلی');
    expect(labels).toContain('کاربران');
    expect(labels).toContain('مصرف و هزینه');
    expect(labels).toContain('لاگ‌ها و خروجی‌ها');
    expect(labels).toContain('سلامت سرویس');
  });
});

