export function removeEmoji(str: string): string {
  return str.replace(/\p{Emoji}/gu, '');
}
