import { FOLDER_ICONS } from '../../hooks/reducers/useFoldersReducer';

export function removeEmoji(str: string, emoticon?: string): string {
  let result = str;
  if (emoticon && Object.keys(FOLDER_ICONS).includes(emoticon)) {
    result = result?.replace?.(emoticon, '');
  }
  return result?.replace?.(/\p{Emoji}/gu, '');
}
