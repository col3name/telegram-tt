import { FOLDER_ICONS } from '../../hooks/reducers/useFoldersReducer';
import { ApiChatFolder, ApiMessageEntity, ApiMessageEntityTypes } from '../../api/types';
import { isCustomEmoji } from '../../api/gramjs/apiBuilders/peers';

function isPredefinedEmoji(emoticon: string): boolean {
  return Object.keys(FOLDER_ICONS).includes(emoticon);
}

export function removeEmoji(str: string, emoticon?: string): string {
  let result = str;
  if (emoticon && isPredefinedEmoji(emoticon)) {
    result = result?.replace?.(emoticon, '');
  }
  return result?.replace?.(/\p{Emoji}/gu, '').trim();
}

export function extractEmojis(text: string): string[] {
  const emojis = text.match(/\p{Emoji}/gu);

  return emojis || [];
}

function findLastEmoji(text: string, emoticon?: string): string {
  if (emoticon && isPredefinedEmoji(emoticon)) {
    return emoticon;
  }
  const emojiRegex = /\p{Emoji}/gu;
  const match = text.match(emojiRegex);
  if (match) {
    return match.at(-1);
  }
  return '';
}

export const getTitleEntities = (folder: Omit<ApiChatFolder, 'id' | 'description'>) => {
  if (!folder) {
    return undefined;
  }
  const emoji = folder.title.entities?.find(
    (entity: ApiMessageEntity) => entity.type === ApiMessageEntityTypes.CustomEmoji,
  );
  const docId = isCustomEmoji(emoji) ? emoji?.documentId : undefined;
  const emoticon = folder?.emoticon;

  return {
    emoticon: emoticon || findLastEmoji(folder.title.text, folder.emoticon),
    docId,
  };
};
