export type ValidityKind = 'active' | 'expired' | 'upcoming';

export type ValidityInfo = {
  kind: ValidityKind;
  text: string;
};

export function getValidityInfo(
  effectiveFrom: string,
  effectiveTo: string,
  now: Date = new Date(),
): ValidityInfo {
  const start = new Date(`${effectiveFrom}T00:00:00`);
  const end = new Date(`${effectiveTo}T23:59:59`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { kind: 'active', text: '有效期未知' };
  }
  if (now < start) {
    return { kind: 'upcoming', text: `未开始 ${effectiveFrom}` };
  }
  if (now > end) {
    return { kind: 'expired', text: `已过期 ${effectiveTo}` };
  }
  return { kind: 'active', text: `有效至 ${effectiveTo}` };
}
