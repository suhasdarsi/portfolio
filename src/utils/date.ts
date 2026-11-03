export function formatDate(dateInput: Date | string): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) throw new Error('Invalid date');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}

export function getReadingTime(content: string): string {
  if (!content) return '';
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  // 150 words a minute: a careful pace for technical notes with figures to read.
  const minutes = Math.ceil(words / 150);
  if (minutes < 1) return '< 1 min read';
  return `${minutes} min read`;
}

export function formatDateWithYear(dateInput: Date | string): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) throw new Error('Invalid date');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}
