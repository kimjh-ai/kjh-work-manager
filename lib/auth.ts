// 관리자 이메일 목록
const ADMIN_EMAILS = ["kimjh@rototobebe.co.kr"];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
