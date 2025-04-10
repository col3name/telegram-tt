import type { ActionReturnType } from '../../types';

import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { addActionHandler } from '../../index';
import { updateTabState } from '../../reducers/tabs';

addActionHandler('setCustomEmojiGroupSearchQuery', (global, actions, payload): ActionReturnType => {
  const {
    emojiGroup,
    tabId = getCurrentTabId(),
    onTab = true,
  } = payload!;

  return updateTabState(global, {
    customEmojiSearch: {
      query: undefined,
      group: emojiGroup,
      onTab,
      resultIds: undefined,
    },
  }, tabId);
});

addActionHandler('setCustomEmojiSearchQuery', (global, actions, payload): ActionReturnType => {
  const {
    query,
    emojiGroup,
    tabId = getCurrentTabId(),
    onTab = true,
  } = payload!;

  return updateTabState(global, {
    customEmojiSearch: {
      query: query?.toLocaleLowerCase?.()?.trim?.(),
      group: emojiGroup,
      onTab,
      resultIds: undefined,
    },
  }, tabId);
});

addActionHandler('setStickerSearchQuery', (global, actions, payload): ActionReturnType => {
  const { query, tabId = getCurrentTabId(), onTab = true } = payload!;

  return updateTabState(global, {
    stickerSearch: {
      query: query?.toLocaleLowerCase?.()?.trim?.(),
      onTab,
      resultIds: undefined,
    },
  }, tabId);
});

addActionHandler('setGifSearchQuery', (global, actions, payload): ActionReturnType => {
  const {
    query,
    group,
    tabId = getCurrentTabId(),
    onTab = true,
  } = payload!;

  return updateTabState(global, {
    gifSearch: {
      query,
      onTab,
      group,
      offset: undefined,
      // offsetId: undefined,
      results: undefined,
    },
  }, tabId);
});
