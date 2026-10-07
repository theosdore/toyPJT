export function formatDate(date: Date | null, pattern: string): string {
  if (!date) return '';
  switch (pattern) {
    case 'yyyy-MM-dd':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    case 'yyyy_MM_DD':
      return `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`;
    case 'yyyyMMdd':
      return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    case 'yyyy년 MM월 dd일':
      return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`;
    default:
      return date.toISOString().slice(0, 10);
  }
}
