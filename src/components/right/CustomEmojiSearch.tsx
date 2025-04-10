import React, { type FC, memo, useEffect, useMemo, useRef } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';
import { selectCurrentCustomEmojiSearch, selectTabState } from '../../global/selectors';
import useOldLang from '../../hooks/useOldLang';
import StickerSetResult from './StickerSetResult';
import Loading from '../ui/Loading';
import useHistoryBack from '../../hooks/useHistoryBack';
import { throttle } from '../../util/schedulers';
import type { ApiSticker, ApiStickerSet } from '../../api/types';
import { pickTruthy, unique } from '../../util/iteratees';
import StickerSet from '../common/StickerSet';
import type { EmojiKeywords, StickerSetOrReactionsSetOrRecent } from '../../types';
import { BASE_EMOJI_KEYWORD_LANG, TOP_SYMBOL_SET_ID } from '../../config';
import { useStickerPickerObservers } from '../common/hooks/useStickerPickerObservers';

type OwnProps = {
  onClose: NoneToVoidFunction;
  isActive: boolean;
};

type StateProps = {
  query?: string;
  emojiKeywords?: EmojiKeywords;
  customEmojisById: Record<string, ApiSticker>;
  stickerSetsById: Record<string, ApiStickerSet>;
  customEmojiFeaturedIds?: string[];
  resultIds?: string[];
  isModalOpen: boolean;
};

const runThrottled = throttle((cb) => cb(), 60000, true);

function searhStickerByQuery(emoticons, query: string) {
  return (sticker: ApiSticker) => {
    if (sticker.emoji && emoticons.some(it => it === sticker?.emoji)) {
      return true;
    }
    if (sticker.emoji === query) {
      return true;
    }
    if ('shortName' in sticker.stickerSetInfo) {
      return sticker.stickerSetInfo.shortName === query;
    }
    return false;
  };
}

const CustomEmojiSearch: FC<OwnProps & StateProps> = ({
  isActive,
  query,
  emojiKeywords,
  stickerSetsById,
  customEmojisById,
  customEmojiFeaturedIds,
  resultIds,
  isModalOpen,
  onClose,
}) => {
  const {
    loadFeaturedEmojiStickers,
  } = getActions();

  const keywordsToEmoji = emojiKeywords?.keywordsToEmoji;
  const containerRef = useRef<HTMLDivElement>(undefined);
  const headerRef = useRef<HTMLDivElement>(undefined);

  // Due to the parent Transition, this component never gets unmounted,
  // that's why we use throttled API call on every update.
  useEffect(() => {
    runThrottled(() => {
      loadFeaturedEmojiStickers();
    });
  });

  useHistoryBack({
    isActive,
    onBack: onClose,
  });

  const lang = useOldLang();
  const searchEmojiGroups = useMemo(() => {
    if (!customEmojisById || !resultIds) {
      return undefined;
    }
    let result = Object.values(pickTruthy(customEmojisById, resultIds));
    if (result.length === 0 && stickerSetsById) {
      const values = Object.values(pickTruthy(stickerSetsById, resultIds));
      const keywords = (emojiKeywords?.keywords && Object.keys(emojiKeywords?.keywords)) || [];
      const stickers = values.reduce((acc, item) => {
        if (item.stickers) {
          if (keywords && query && keywordsToEmoji) {
            keywords
              .forEach(keyword => {
                const emoticons = keywordsToEmoji[keyword];
                const list = item.stickers?.filter?.(searhStickerByQuery(emoticons, query)) || [];
                acc.push(...list);
              });
          }
        }
        return acc;
      }, [] as ApiSticker[]);

      result = result.concat(stickers);
    }
    return result;
  }, [customEmojisById, resultIds, stickerSetsById, emojiKeywords?.keywords, query]);

  const allSets = useMemo(() => {
    const defaultSets: StickerSetOrReactionsSetOrRecent[] = [];
    if (searchEmojiGroups?.length) {
      defaultSets.push({
        id: TOP_SYMBOL_SET_ID,
        accessHash: 'f0',
        title: '',
        stickers: searchEmojiGroups,
        count: searchEmojiGroups.length,
        isEmoji: true,
      });
      return defaultSets;
    }

    if (customEmojiFeaturedIds) {
      const setIdsToDisplay = unique(customEmojiFeaturedIds);

      const setsToDisplay = Object.values(pickTruthy(stickerSetsById, setIdsToDisplay));
      defaultSets.push(...setsToDisplay);
    }

    return defaultSets;
  }, [customEmojiFeaturedIds, searchEmojiGroups, stickerSetsById]);

  const prefix = '';
  const {
    observeIntersectionForSet,
    observeIntersectionForPlayingItems,
    observeIntersectionForShowingItems,
    observeIntersectionForCovers,
  } = useStickerPickerObservers(containerRef, headerRef, prefix, false);

  function renderContent() {
    if (query === undefined) {
      return undefined;
    }

    if (!query && customEmojiFeaturedIds) {
      return allSets.map((sticker) => (
        <StickerSet
          key={sticker.id}
          stickerSet={sticker}
          observeIntersection={observeIntersectionForSet}
          loadAndPlay
          index={0}
          idPrefix=""
          isNearActive
          observeIntersectionForPlayingItems={observeIntersectionForPlayingItems}
          observeIntersectionForShowingItems={observeIntersectionForShowingItems}
        />
      ));
    }
    //
    if (allSets) {
      if (allSets.length === 0) {
        return <p className="helper-text" dir="auto">Nothing found.</p>;
      }
      return allSets.map((sticker) => (
        <StickerSet
          key={sticker.id}
          stickerSet={sticker}
          observeIntersection={observeIntersectionForSet}
          loadAndPlay
          forcePlayback
          index={0}
          idPrefix=""
          isNearActive
          observeIntersectionForPlayingItems={observeIntersectionForPlayingItems}
          observeIntersectionForShowingItems={observeIntersectionForShowingItems}
          observeIntersectionForCovers={observeIntersectionForCovers}
        />
      ));
    }
    if (resultIds) {
      if (!resultIds.length) {
        return <p className="helper-text" dir="auto">Nothing found.</p>;
      }

      return resultIds.map((id) => (
        // id
        <StickerSetResult
          key={id}
          stickerSetId={id}
          observeIntersection={observeIntersectionForSet}
          isModalOpen={isModalOpen}
        />
      ));
    }

    return <Loading />;
  }
  return (
    <div>
      <div ref={headerRef}></div>
      <div ref={containerRef} className="StickerSearch custom-scroll" dir={lang.isRtl ? 'rtl' : undefined}>
        {renderContent()}
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): StateProps => {
    const currentSearch = selectCurrentCustomEmojiSearch(global);
    const { query, resultIds } = currentSearch || {};
    const {
      featuredIds: customEmojiFeaturedIds,
      byId: customEmojisById,
    } = global.customEmojis;
    const {
      setsById: stickerSetsById,
    } = global.stickers;
    const {
      language,
    } = global.settings.byKey;
    const baseEmojiKeywords = global.emojiKeywords[BASE_EMOJI_KEYWORD_LANG];
    const emojiKeywords = language !== BASE_EMOJI_KEYWORD_LANG ? global.emojiKeywords[language] : undefined;

    return {
      query,
      customEmojiFeaturedIds,
      customEmojisById,
      stickerSetsById,
      emojiKeywords: emojiKeywords || baseEmojiKeywords,
      resultIds,
      isModalOpen: Boolean(selectTabState(global).openedStickerSetShortName),
    };
  },
)(CustomEmojiSearch));
