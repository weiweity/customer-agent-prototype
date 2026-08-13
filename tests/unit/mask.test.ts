import { describe, expect, it } from 'vitest';
import {
  QUERY_PREVIEW_LIMIT,
  createQueryPreview,
} from '../../src/renderer/features/recent/mask';

describe('createQueryPreview', () => {
  it('masks mainland mobile numbers and emails', () => {
    const preview = createQueryPreview('用户 13812345678 邮箱 demo.user@example.com 问亮度');
    expect(preview).toContain('138****5678');
    expect(preview).not.toContain('13812345678');
    expect(preview).toMatch(/d\*\*\*@example\.com|d\*\*\*@/);
    expect(preview).not.toContain('demo.user@example.com');
  });

  it('truncates the masked preview to 32 characters', () => {
    const preview = createQueryPreview(
      '13900001111 这是一条很长的客户问题需要被截断到三十二个字符以外',
    );
    expect(preview.length).toBe(QUERY_PREVIEW_LIMIT);
    expect(preview).toContain('139****1111');
    expect(preview).not.toContain('13900001111');
    expect(preview.startsWith('139****1111')).toBe(true);
  });
});
