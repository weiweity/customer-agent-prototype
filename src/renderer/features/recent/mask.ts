const PHONE_PATTERN = /(?<!\d)(1[3-9]\d{9})(?!\d)/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export const QUERY_PREVIEW_LIMIT = 32;

export function maskPhoneNumbers(text: string): string {
  return text.replace(PHONE_PATTERN, (match) => `${match.slice(0, 3)}****${match.slice(7)}`);
}

export function maskEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, (match) => {
    const [local, domain] = match.split('@');
    const visible = local.slice(0, 1) || '*';
    return `${visible}***@${domain}`;
  });
}

export function createQueryPreview(query: string): string {
  const collapsed = query.replace(/\s+/g, ' ').trim();
  const masked = maskEmails(maskPhoneNumbers(collapsed));
  if (masked.length <= QUERY_PREVIEW_LIMIT) {
    return masked;
  }
  return masked.slice(0, QUERY_PREVIEW_LIMIT);
}
