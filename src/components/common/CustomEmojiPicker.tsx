import {FC, useState} from '../../lib/teact/teact';
import React, {
  memo, useEffect, useMemo, useRef,
} from '../../lib/teact/teact';
import { getGlobal, getActions, withGlobal } from '../../global';

import type {
  ApiAvailableReaction, ApiEmojiGroup, ApiReaction, ApiReactionWithPaid, ApiSticker, ApiStickerSet,
} from '../../api/types';
import type { EmojiKeywords, StickerSetOrReactionsSetOrRecent } from '../../types';

import {
  BASE_EMOJI_KEYWORD_LANG,
  FAVORITE_SYMBOL_SET_ID,
  POPULAR_SYMBOL_SET_ID,
  RECENT_SYMBOL_SET_ID,
  SLIDE_TRANSITION_DURATION,
  STICKER_PICKER_MAX_SHARED_COVERS,
  STICKER_SIZE_PICKER_HEADER,
  TOP_SYMBOL_SET_ID,
} from '../../config';
import { MEMO_EMPTY_ARRAY } from '../../util/memo';
import { isSameReaction } from '../../global/helpers';
import {
  selectCanPlayAnimatedEmojis,
  selectChatFullInfo,
  selectCurrentCustomEmojiSearch,
  selectIsAlwaysHighPriorityEmoji,
  selectIsChatWithSelf,
  selectIsCurrentUserPremium,
} from '../../global/selectors';
import animateHorizontalScroll from '../../util/animateHorizontalScroll';
import buildClassName from '../../util/buildClassName';
import { pickTruthy, unique } from '../../util/iteratees';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';
import { REM } from './helpers/mediaDimensions';
import { FOLDER_ICONS_LIST } from "../../hooks/reducers/useFoldersReducer";
import {
  EmojiData, type EmojiModule, type EmojiRawData, uncompressEmoji,
} from '../../util/emoji/emoji';
import animateScroll from '../../util/animateScroll';
import { fuzzySearch } from '../../util/fuzzySearch';
import { getCustomFolderIconName } from '../left/main/ChatFoldersDesktop';

import useAppLayout from '../../hooks/useAppLayout';
import useHorizontalScroll from '../../hooks/useHorizontalScroll';
import useLastCallback from '../../hooks/useLastCallback';
import useOldLang from '../../hooks/useOldLang';
import usePrevDuringAnimation from '../../hooks/usePrevDuringAnimation';
import useScrolledState from '../../hooks/useScrolledState';
import useAsyncRendering from '../right/hooks/useAsyncRendering';
import { useStickerPickerObservers } from './hooks/useStickerPickerObservers';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import useFlag from '../../hooks/useFlag';

import StickerSetCover from '../middle/composer/StickerSetCover';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import Icon from './icons/Icon';
import StickerButton from './StickerButton';
import StickerSet from './StickerSet';
import EmojiCategory from '../middle/composer/EmojiCategory';
import SymbolMenuSearch from '../middle/composer/SymbolMenuSearch';

import pickerStyles from '../middle/composer/StickerPicker.module.scss';
import styles from './CustomEmojiPicker.module.scss';

import type { IconName } from '../../types/icons';
import {extractEmojis} from "../../util/emoji/removeEmoji";

type OwnProps = {
  ref?: React.RefObject<HTMLDivElement>;
  withRecent?: boolean;
  withFolder?: boolean;
  isFolder?: boolean;
  chatId?: string;
  className?: string;
  pickerListClassName?: string;
  isHidden?: boolean;
  loadAndPlay: boolean;
  idPrefix?: string;
  withDefaultTopicIcons?: boolean;
  selectedReactionIds?: string[];
  isStatusPicker?: boolean;
  isReactionPicker?: boolean;
  isTranslucent?: boolean;
  onEmojiSelect?: (emoji: string, name: string) => void;
  onCustomEmojiSelect: (sticker: ApiSticker) => void;
  onReactionSelect?: (reaction: ApiReactionWithPaid) => void;
  onReactionContext?: (reaction: ApiReactionWithPaid) => void;
  onContextMenuOpen?: NoneToVoidFunction;
  onContextMenuClose?: NoneToVoidFunction;
  onContextMenuClick?: NoneToVoidFunction;
};

type StateProps = {
  query?: string;
  emojiKeywords?: EmojiKeywords;
  selectedEmojiGroup?: ApiEmojiGroup | undefined;
  resultIds?: string[];
  customEmojisById?: Record<string, ApiSticker>;
  recentCustomEmojiIds?: string[];
  recentStatusEmojis?: ApiSticker[];
  chatEmojiSetId?: string;
  topReactions?: ApiReaction[];
  recentReactions?: ApiReaction[];
  defaultTagReactions?: ApiReaction[];
  stickerSetsById: Record<string, ApiStickerSet>;
  availableReactions?: ApiAvailableReaction[];
  addedCustomEmojiIds?: string[];
  defaultTopicIconsId?: string;
  defaultStatusIconsId?: string;
  customEmojiFeaturedIds?: string[];
  canAnimate?: boolean;
  isSavedMessages?: boolean;
  isCurrentUserPremium?: boolean;
  isWithPaidReaction?: boolean;
};

const HEADER_BUTTON_WIDTH = 2.5 * REM; // px (including margin)

const DEFAULT_ID_PREFIX = 'custom-emoji-set';
const TOP_REACTIONS_COUNT = 16;
const RECENT_REACTIONS_COUNT = 32;
const RECENT_DEFAULT_STATUS_COUNT = 7;
const FADED_BUTTON_SET_IDS = new Set([RECENT_SYMBOL_SET_ID, FAVORITE_SYMBOL_SET_ID, POPULAR_SYMBOL_SET_ID]);
const STICKER_SET_IDS_WITH_COVER = new Set([
  RECENT_SYMBOL_SET_ID,
  FAVORITE_SYMBOL_SET_ID,
  POPULAR_SYMBOL_SET_ID,
]);

function searchEmoji(obj:Record<string, unknown>, searchValue:string) {
  const filtered = Object.keys(obj).reduce((acc, key) => {
    if (key.includes(searchValue)) {
      // @ts-ignore
      acc[key] = obj[key];
    }
    return acc;
  }, {});
  return filtered;
}

type EmojiCategoryData = { id: string; name: string; emojis: string[] };

const OPEN_ANIMATION_DELAY = 200;

const SMOOTH_SCROLL_DISTANCE = 100;
const FOCUS_MARGIN = REM;
// const HEADER_BUTTON_WIDTH = 2.625 * REM; // Includes margins
const INTERSECTION_THROTTLE = 200;

const ICONS_BY_CATEGORY: Record<string, IconName> = {
  recent: 'recent',
  people: 'smile',
  nature: 'animals',
  foods: 'eats',
  activity: 'sport',
  places: 'car',
  objects: 'lamp',
  symbols: 'language',
  flags: 'flag',
};

const categoryIntersections: boolean[] = [];

let emojiDataPromise: Promise<EmojiModule>;
let emojiRawData: EmojiRawData;
let emojiData: EmojiData;

const CustomEmojiPicker: FC<OwnProps & StateProps> = ({
  ref,
  className,
  query,
  withRecent,
  withFolder,
  selectedEmojiGroup,
  resultIds,
  pickerListClassName,
  isHidden,
  loadAndPlay,
  addedCustomEmojiIds,
  customEmojisById,
  recentCustomEmojiIds,
  selectedReactionIds,
  recentStatusEmojis,
  stickerSetsById,
  chatEmojiSetId,
  topReactions,
  recentReactions,
  availableReactions,
  idPrefix = DEFAULT_ID_PREFIX,
  customEmojiFeaturedIds,
  canAnimate,
  isReactionPicker,
  isStatusPicker,
  isTranslucent,
  emojiKeywords,
  isSavedMessages,
  isCurrentUserPremium,
  withDefaultTopicIcons,
  defaultTopicIconsId,
  defaultStatusIconsId,
  defaultTagReactions,
  isWithPaidReaction,
  onEmojiSelect,
  onCustomEmojiSelect,
  onReactionSelect,
  onReactionContext,
  onContextMenuOpen,
  onContextMenuClose,
  onContextMenuClick,
}) => {
  // eslint-disable-next-line no-null/no-null
  let containerRef = useRef<HTMLDivElement>(null);
  if (ref) {
    containerRef = ref;
  }
  // eslint-disable-next-line no-null/no-null
  const headerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const emojiHeaderRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasHqRef = useRef<HTMLCanvasElement>(null);

  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<EmojiCategoryData[]>();
  const [emojis, setEmojis] = useState<AllEmojis>();
  const [isInputFocused, markInputFocused, unmarkInputFocused] = useFlag(false);

  const lang = useOldLang();
  const emoticonToKeywords = emojiKeywords?.keywordsToEmoji;

  const allCategories: EmojiCategoryData[] = useMemo(() => {
    if (!categories) {
      return MEMO_EMPTY_ARRAY;
    }
    const themeCategories = [...categories];
    if (query) {
      return themeCategories.filter((it: EmojiCategoryData) => (
        fuzzySearch(it.name?.toLowerCase?.(), query?.toLowerCase?.()) || it.emojis.includes(query)
      ));
    }
    if (selectedEmojiGroup) {
      const localKeywords = selectedEmojiGroup.emoticons?.reduce((acc: Set<string>, emoticon: string) => {
        if (!emoticonToKeywords) {
          return acc;
        }
        const keywords = emoticonToKeywords[emoticon];
        keywords.forEach((word: string) => {
          acc.add(word);
        });
        return acc;
      }, new Set<string>());

      const emojiList = themeCategories.reduce((acc: string[], emojiCategoryData: EmojiCategoryData) => {
        if (!selectedEmojiGroup.emoticons) {
          return acc;
        }
        const strings = emojiCategoryData.emojis.filter((emoji: string) => localKeywords?.has(emoji));
        if (strings.length > 0) {
          acc.push(...strings);
        }
        return acc;
      }, [] as string[]);
      return [{
        id: '0',
        name: lang('Emojis'),
        emojis: emojiList,
      }];
    }
    return themeCategories;
  }, [categories, emoticonToKeywords, lang, query, selectedEmojiGroup]);

  // Initialize data on first render.
  useEffect(() => {
    setTimeout(() => {
      const exec = () => {
        setCategories(emojiData.categories);

        setEmojis(emojiData.emojis as AllEmojis);
      };

      if (emojiData) {
        exec();
      } else {
        ensureEmojiData()
          .then(exec);
      }
    }, OPEN_ANIMATION_DELAY);
  }, []);
  const {
    fetchEmojiGroups,
    setCustomEmojiSearchQuery,
    setCustomEmojiGroupSearchQuery,
  } = getActions();

  const onGroupClick = (props: { emoji: string; group: ApiEmojiGroup }) => {
    if (selectedEmojiGroup?.iconEmojiId === props.group.iconEmojiId) {
      setCustomEmojiGroupSearchQuery({ emojiGroup: undefined, onTab: false });
      return;
    }
    setCustomEmojiGroupSearchQuery({ emojiGroup: props.group, onTab: false });
  };

  const handleCustomEmojiSearchQueryChange = useLastCallback((query: string) => {
    setCustomEmojiSearchQuery({ query, onTab: false });
  });

  // eslint-disable-next-line no-null/no-null
  const onResetSearch = () => {
    setCustomEmojiSearchQuery({ query: '', onTab: false });
    // clearStickersForEmojiGroup();
  };

  const { isMobile } = useAppLayout();
  const {
    handleScroll: handleContentScroll,
    isAtBeginning: shouldHideTopBorder,
  } = useScrolledState();

  const recentCustomEmojis = useMemo(() => {
    return isStatusPicker
      ? recentStatusEmojis
      : Object.values(pickTruthy(customEmojisById!, recentCustomEmojiIds!));
  }, [customEmojisById, isStatusPicker, recentCustomEmojiIds, recentStatusEmojis]);

  const searchEmojisByQuery = useMemo(() => {
    if (!query || !emojiKeywords || !emojiKeywords.keywords || emojiKeywords?.isLoading) {
      return [];
    }
    const uniqueEmojis = unique(extractEmojis(query));
    const targetEmojis = Object.keys(emojiKeywords?.keywords || {}).reduce((acc: Set<string>, keyword: string) => {
      if (fuzzySearch(keyword, query) && emojiKeywords.keywords) {
        const emojis: string[] = emojiKeywords.keywords[keyword];
        if (emojis) {
          emojis.forEach(it => {
            it !== undefined && acc.add(it);
          });
        }
      }
      return acc;
    }, new Set<string>());
    uniqueEmojis.forEach((emoji: string) => targetEmojis.add(emoji));

    const stickers = Object.keys(customEmojisById || {}).reduce((acc: ApiSticker[], id: string) => {
      const apiSticker = customEmojisById![id];
      if (apiSticker.emoji && targetEmojis.has(apiSticker.emoji)) {
        acc.push(apiSticker);
      }
      return acc;
    }, [] as ApiSticker[]);
    return stickers;
  }, [customEmojisById, emojiKeywords, query]);

  const searchEmojiGroups = useMemo(() => {
    if (!selectedEmojiGroup || !customEmojisById || !resultIds) {
      return undefined;
    }
    let result = Object.values(pickTruthy(customEmojisById, resultIds));
    if (result.length === 0 && stickerSetsById) {
      const values = Object.values(pickTruthy(stickerSetsById, resultIds));
      const stickers = values.reduce((acc, item) => {
        if (item.stickers) {
          acc.push(...item.stickers);
        }
        return acc;
      }, [] as ApiSticker[]);
      result = result.concat(stickers);
    } else {
    }
    return result;
  }, [customEmojisById, stickerSetsById, resultIds, selectedEmojiGroup]);

  const prefix = `${idPrefix}-custom-emoji`;
  const {
    activeSetIndex,
    observeIntersectionForSet,
    observeIntersectionForPlayingItems,
    observeIntersectionForShowingItems,
    observeIntersectionForCovers,
    selectStickerSet,
  } = useStickerPickerObservers(containerRef, headerRef, prefix, isHidden);

  const canLoadAndPlay = usePrevDuringAnimation(loadAndPlay || undefined, SLIDE_TRANSITION_DURATION);

  const loadingSearchResult = selectedEmojiGroup ? !searchEmojiGroups?.length : false;
  const areAddedLoaded = Boolean(addedCustomEmojiIds && emojis);

  const allSets = useMemo(() => {
    const defaultSets: StickerSetOrReactionsSetOrRecent[] = [];
    if (query) {
      defaultSets.push({
        id: POPULAR_SYMBOL_SET_ID,
        accessHash: 'f1',
        title: '',
        stickers: searchEmojisByQuery,
        count: searchEmojisByQuery?.length || 0,
        isEmoji: true,
      });
      return defaultSets;
    }
    if (selectedEmojiGroup || searchEmojiGroups?.length) {
      defaultSets.push({
        id: POPULAR_SYMBOL_SET_ID,
        accessHash: 'f0',
        title: '',
        stickers: searchEmojiGroups,
        count: searchEmojiGroups?.length || 0,
        isEmoji: true,
      });
      return defaultSets;
    }

    if (isReactionPicker && isSavedMessages) {
      if (defaultTagReactions?.length) {
        defaultSets.push({
          id: TOP_SYMBOL_SET_ID,
          accessHash: '',
          title: lang('PremiumPreviewTags'),
          reactions: defaultTagReactions,
          count: defaultTagReactions.length,
          isEmoji: true,
        });
      }
    }

    if (isReactionPicker && !isSavedMessages) {
      const topReactionsSlice: ApiReactionWithPaid[] = topReactions?.slice(0, TOP_REACTIONS_COUNT) || [];
      if (isWithPaidReaction) {
        topReactionsSlice.unshift({ type: 'paid' });
      }
      if (topReactionsSlice?.length) {
        defaultSets.push({
          id: TOP_SYMBOL_SET_ID,
          accessHash: '',
          title: lang('Reactions'),
          reactions: topReactionsSlice,
          count: topReactionsSlice.length,
          isEmoji: true,
        });
      }

      const cleanRecentReactions = (recentReactions || [])
        .filter((reaction) => !topReactionsSlice.some((topReaction) => isSameReaction(topReaction, reaction)))
        .slice(0, RECENT_REACTIONS_COUNT);
      const cleanAvailableReactions = (availableReactions || [])
        .filter(({ isInactive }) => !isInactive)
        .map(({ reaction }) => reaction)
        .filter((reaction) => {
          return !topReactionsSlice.some((topReaction) => isSameReaction(topReaction, reaction))
            && !cleanRecentReactions.some((topReaction) => isSameReaction(topReaction, reaction));
        });
      if (cleanAvailableReactions?.length || cleanRecentReactions?.length) {
        const isPopular = !cleanRecentReactions?.length;
        const allRecentReactions = cleanRecentReactions.concat(cleanAvailableReactions);
        defaultSets.push({
          id: isPopular ? POPULAR_SYMBOL_SET_ID : RECENT_SYMBOL_SET_ID,
          accessHash: '',
          title: lang(isPopular ? 'PopularReactions' : 'RecentStickers'),
          reactions: allRecentReactions,
          count: allRecentReactions.length,
          isEmoji: true,
        });
      }
    } else if (isStatusPicker) {
      const defaultStatusIconsPack = stickerSetsById[defaultStatusIconsId!];
      if (defaultStatusIconsPack?.stickers?.length) {
        const stickers = defaultStatusIconsPack.stickers
          .slice(0, RECENT_DEFAULT_STATUS_COUNT)
          .concat(recentCustomEmojis || []);
        defaultSets.push({
          ...defaultStatusIconsPack,
          stickers,
          count: stickers.length,
          id: RECENT_SYMBOL_SET_ID,
          title: lang('RecentStickers'),
        });
      }
    } else if (withDefaultTopicIcons) {
      const defaultTopicIconsPack = stickerSetsById[defaultTopicIconsId!];
      if (defaultTopicIconsPack.stickers?.length) {
        defaultSets.push({
          ...defaultTopicIconsPack,
          id: RECENT_SYMBOL_SET_ID,
          title: lang('RecentStickers'),
        });
      }
    } else if (recentCustomEmojis?.length) {
      defaultSets.push({
        id: RECENT_SYMBOL_SET_ID,
        accessHash: '0',
        title: lang('RecentStickers'),
        stickers: recentCustomEmojis,
        count: recentCustomEmojis.length,
        isEmoji: true,
      });
    }

    const userSetIds = [...(addedCustomEmojiIds || [])];
    if (chatEmojiSetId) {
      userSetIds.unshift(chatEmojiSetId);
    }

    const setIdsToDisplay = unique(userSetIds.concat(customEmojiFeaturedIds || []));

    const setsToDisplay = Object.values(pickTruthy(stickerSetsById, setIdsToDisplay));

    return [
      ...defaultSets,
      ...setsToDisplay,
    ];
  }, [
    selectedEmojiGroup, searchEmojiGroups, searchEmojisByQuery, query,
    addedCustomEmojiIds, isReactionPicker, isStatusPicker, withDefaultTopicIcons, recentCustomEmojis,
    customEmojiFeaturedIds, stickerSetsById, topReactions, availableReactions, lang, recentReactions,
    defaultStatusIconsId, defaultTopicIconsId, isSavedMessages, defaultTagReactions, chatEmojiSetId,
    isWithPaidReaction,
  ]);

  const recentSets = useMemo(() => {
    return allSets.filter(it => it.id === RECENT_SYMBOL_SET_ID);
  }, [allSets]);

  const noPopulatedSets = useMemo(() => (
    areAddedLoaded
    && allSets.filter((set) => set.stickers?.length).length === 0
  ), [allSets, areAddedLoaded]);

  const canRenderContent = useAsyncRendering([], SLIDE_TRANSITION_DURATION);
  const shouldRenderContent = emojis && areAddedLoaded && canRenderContent && !noPopulatedSets;

  useEffect(() => {
    fetchEmojiGroups({ premium: true });
  });

  useHorizontalScroll(headerRef, isMobile || !shouldRenderContent);
  useHorizontalScroll(emojiHeaderRef, !(isMobile && shouldRenderContent));

  // Scroll container and header when active set changes
  useEffect(() => {
    if (!areAddedLoaded) {
      return;
    }

    const header = headerRef.current;
    if (!header) {
      return;
    }

    const newLeft = activeSetIndex * HEADER_BUTTON_WIDTH - (header.offsetWidth / 2 - HEADER_BUTTON_WIDTH / 2) + 150;

    animateHorizontalScroll(header, newLeft);
  }, [areAddedLoaded, activeSetIndex]);

  // Scroll header when active set updates
  useEffect(() => {
    if (!categories) {
      return;
    }

    const header = emojiHeaderRef.current;
    if (!header) {
      return;
    }

    const newLeft = (activeCategoryIndex || 0) * HEADER_BUTTON_WIDTH - header.offsetWidth / 2 + HEADER_BUTTON_WIDTH / 2;

    animateHorizontalScroll(header, newLeft);
  }, [categories, activeCategoryIndex]);

  const onStickerSelect = useLastCallback((emoji: ApiSticker) => {
    onCustomEmojiSelect(emoji);
  });

  const handleEmojiSelect = useLastCallback((emoji: string, name: string) => {
    onEmojiSelect?.(emoji, name);
  });

  function renderCover(stickerSet: StickerSetOrReactionsSetOrRecent, index: number) {
    const firstSticker = stickerSet.stickers?.[0];
    const buttonClassName = buildClassName(
      pickerStyles.stickerCover,
      (!(index === 0 && activeCategoryIndex && activeCategoryIndex > 0) && index === activeSetIndex) && styles.activated,
    );

    const withSharedCanvas = index < STICKER_PICKER_MAX_SHARED_COVERS;
    const isHq = selectIsAlwaysHighPriorityEmoji(getGlobal(), stickerSet as ApiStickerSet);

    if (stickerSet.id === TOP_SYMBOL_SET_ID) {
      return undefined;
    }

    if (STICKER_SET_IDS_WITH_COVER.has(stickerSet.id) || stickerSet.hasThumbnail || !firstSticker) {
      const isRecent = stickerSet.id === RECENT_SYMBOL_SET_ID || stickerSet.id === POPULAR_SYMBOL_SET_ID;
      const isFaded = FADED_BUTTON_SET_IDS.has(stickerSet.id);
      return (
        <Button
          key={stickerSet.id}
          className={buttonClassName}
          ariaLabel={stickerSet.title}
          round
          faded={isFaded}
          color="translucent"
          // eslint-disable-next-line react/jsx-no-bind
          onClick={() => {
            selectStickerSet(isRecent ? 0 : index);
            setActiveCategoryIndex(undefined);
          }}
        >
          {isRecent ? (
            <Icon name="recent" />
          ) : (
            <StickerSetCover
              stickerSet={stickerSet as ApiStickerSet}
              noPlay={!canAnimate || !canLoadAndPlay}
              forcePlayback
              observeIntersection={observeIntersectionForCovers}
              sharedCanvasRef={withSharedCanvas ? (isHq ? sharedCanvasHqRef : sharedCanvasRef) : undefined}
            />
          )}
        </Button>
      );
    }

    return (
      <StickerButton
        key={stickerSet.id}
        sticker={firstSticker}
        size={STICKER_SIZE_PICKER_HEADER}
        title={stickerSet.title}
        className={buttonClassName}
        noPlay={!canAnimate || !canLoadAndPlay}
        observeIntersection={observeIntersectionForCovers}
        noContextMenu
        isCurrentUserPremium
        sharedCanvasRef={withSharedCanvas ? (isHq ? sharedCanvasHqRef : sharedCanvasRef) : undefined}
        withTranslucentThumb={isTranslucent}
        onClick={(index) => {
          selectStickerSet(index);
          setActiveCategoryIndex(undefined);
        }}
        clickArg={index}
        forcePlayback
      />
    );
  }

  const fullClassName = buildClassName('StickerPicker', styles.root, className);

  const selectCategory = useLastCallback((index: number) => {
    setActiveCategoryIndex(index);
    const categoryEl = containerRef.current!.closest<HTMLElement>('.SymbolMenu-main')!
      .querySelector(`#emoji-category-${index}`)! as HTMLElement;
    animateScroll({
      container: containerRef.current!,
      element: categoryEl,
      position: 'start',
      // margin: FOCUS_MARGIN,
      maxDistance: 200,
    });
  });

  const { observe: observeIntersection } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE,
  }, (entries) => {
    entries.forEach((entry) => {
      const { id } = entry.target as HTMLDivElement;
      if (!id || !id.startsWith('emoji-category-')) {
        return;
      }

      const index = Number(id.replace('emoji-category-', ''));
      categoryIntersections[index] = entry.isIntersecting;
    });

    const minIntersectingIndex = categoryIntersections.reduce((lowestIndex, isIntersecting, index) => {
      return isIntersecting && index < lowestIndex ? index : lowestIndex;
    }, Infinity);

    if (minIntersectingIndex === Infinity) {
      return;
    }

    setActiveCategoryIndex(minIntersectingIndex);
    if (minIntersectingIndex > 0) {
      // selectCategory(undefined);
    }
  });

  if (!shouldRenderContent && !selectedEmojiGroup && !query) {
    return (
      <div className={fullClassName}>
        { noPopulatedSets ? (
          <div className={pickerStyles.pickerDisabled}>{lang('NothingFound')}</div>
        ) : (
          <Loading />
        )}
      </div>
    );
  }

  const headerClassName = buildClassName(
    pickerStyles.header,
    'no-scrollbar',
    !shouldHideTopBorder && pickerStyles.headerWithBorder,
    (isInputFocused || selectedEmojiGroup !== undefined) && pickerStyles.headerHidden,
  );
  const listClassName = buildClassName(
    pickerStyles.main,
    pickerStyles.main_customEmoji,
    IS_TOUCH_ENV ? 'no-scrollbar' : 'custom-scroll',
    pickerListClassName,
    (!selectedEmojiGroup && !isInputFocused) && pickerStyles.hasHeader,
  );

  // const emojiHeaderClassName = buildClassName(
  // );

  function renderCategoryButton(category: EmojiCategoryData, index: number) {
    const icon = ICONS_BY_CATEGORY[category.id];

    return icon && (
      <Button
        className={`symbol-set-button ${index === activeCategoryIndex ? 'activated' : ''}`}
        round
        faded
        color="translucent"
        // eslint-disable-next-line react/jsx-no-bind
        onClick={() => selectCategory(index)}
        ariaLabel={category.name}
      >
        <Icon name={icon} />
      </Button>
    );
  }

  return (
    <div className={fullClassName}>
      {/*{activeCategoryIndex  + 'index'}*/}
      <div
        ref={headerRef}
        className={headerClassName}
      >
        <div
          style="display: flex; align-items: center;"
        >
          {(withRecent && recentSets.length > 0) && (
            <div>
              {recentSets.length > 0 && renderCover(recentSets[0], 0)}
            </div>
          )}
          <div
            ref={emojiHeaderRef}
            className={buildClassName(
              // 'EmojiPicker-header',
              // !shouldHideTopBorder && 'with-top-border',
              // pickerStyles.stickerCover,
              styles.emojisContainer,
              // (activeSetIndex === 0 && activeCategoryIndex !== undefined) && styles.emojisContainerActive,
              // activeSetIndex && styles.emojisContainerActive,
              (activeCategoryIndex !== undefined) && styles.emojisContainerActive,
            )}
            dir={lang.isRtl ? 'rtl' : undefined}
          >
            {allCategories.map(renderCategoryButton)}
          </div>
          <div className="shared-canvas-container" style="display: flex; align-items: center;">
            <canvas ref={sharedCanvasRef} className="shared-canvas" />
            <canvas ref={sharedCanvasHqRef} className="shared-canvas" />
            {allSets.map((it, index) => (
              index === 0 ? undefined : renderCover(it, index)),
            )}
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleContentScroll}
        className={listClassName}
      >
        <SymbolMenuSearch
          withPremium={false}
          canAnimate={canAnimate}
          query={query}
          selectedGroup={selectedEmojiGroup}
          placeholder={lang('Search')}
          isFocused={isInputFocused}
          onBlur={unmarkInputFocused}
          onFocus={markInputFocused}
          onGroupClick={onGroupClick}
          onChange={handleCustomEmojiSearchQueryChange}
          onReset={onResetSearch}
        />
        {(withFolder && !isInputFocused && !selectedEmojiGroup) && (
          <div
            className={buildClassName('EmojiPicker-grid')}
          >
            {FOLDER_ICONS_LIST.map((emoji) => {
              const name = getCustomFolderIconName(emoji) as IconName;
              return (
                <Button
                  key={emoji}
                  className={buildClassName('EmojiPicker-grid-item')}
                  // className="EmojiPicker-grid-item"
                  round
                  color="translucent"
                  // eslint-disable-next-line react/jsx-no-bind
                  onClick={() => onEmojiSelect(emoji, name)}
                  ariaLabel={name}
                >
                  <Icon name={name}/>
                </Button>
              );
            })}
          </div>
        )}
        {withRecent && recentSets.map((stickerSet, i) => {
          const isRecent = stickerSet.id === RECENT_SYMBOL_SET_ID;
          const shouldHideHeader = stickerSet.id === TOP_SYMBOL_SET_ID
            || (isRecent && (withDefaultTopicIcons || isStatusPicker));
          const isChatEmojiSet = stickerSet.id === chatEmojiSetId;

          if (!isRecent) {
            return undefined;
          }
          return (
            <StickerSet
              key={stickerSet.id}
              stickerSet={stickerSet}
              loadAndPlay={Boolean(canAnimate && canLoadAndPlay)}
              index={i}
              idPrefix={prefix}
              observeIntersection={observeIntersectionForSet}
              observeIntersectionForPlayingItems={observeIntersectionForPlayingItems}
              observeIntersectionForShowingItems={observeIntersectionForShowingItems}
              isNearActive={activeSetIndex >= i - 1 && activeSetIndex <= i + 1}
              isSavedMessages={isSavedMessages}
              isStatusPicker={isStatusPicker}
              isReactionPicker={isReactionPicker}
              shouldHideHeader={shouldHideHeader}
              withDefaultTopicIcon={withDefaultTopicIcons && isRecent}
              withDefaultStatusIcon={isStatusPicker && isRecent}
              isChatEmojiSet={isChatEmojiSet}
              isCurrentUserPremium={isCurrentUserPremium}
              selectedReactionIds={selectedReactionIds}
              availableReactions={availableReactions}
              isTranslucent={isTranslucent}
              onReactionSelect={onReactionSelect}
              onReactionContext={onReactionContext}
              onStickerSelect={onStickerSelect}
              onContextMenuOpen={onContextMenuOpen}
              onContextMenuClose={onContextMenuClose}
              onContextMenuClick={onContextMenuClick}
              forcePlayback
            />
          );
        })}

        {(!query && !selectedEmojiGroup && onEmojiSelect) && allCategories.map((category, i) => (
          <EmojiCategory
            category={category}
            index={i}
            allEmojis={emojis}
            observeIntersection={observeIntersection}
            shouldRender={selectedEmojiGroup || (activeCategoryIndex >= i - 1 && activeCategoryIndex <= i + 1)}
            onEmojiSelect={handleEmojiSelect}
          />
        ))}
        {loadingSearchResult && <Loading />}
        {allSets.map((stickerSet, i) => {
          const isRecent = stickerSet.id === RECENT_SYMBOL_SET_ID;
          const shouldHideHeader = stickerSet.id === TOP_SYMBOL_SET_ID
            || (isRecent && (withDefaultTopicIcons || isStatusPicker));
          const isChatEmojiSet = stickerSet.id === chatEmojiSetId;

          if (isRecent) {
            return undefined;
          }
          return (
            <StickerSet
              key={stickerSet.id}
              stickerSet={stickerSet}
              loadAndPlay={Boolean(canAnimate && canLoadAndPlay)}
              index={i}
              idPrefix={prefix}
              observeIntersection={observeIntersectionForSet}
              observeIntersectionForPlayingItems={observeIntersectionForPlayingItems}
              observeIntersectionForShowingItems={observeIntersectionForShowingItems}
              isNearActive={activeSetIndex >= i - 1 && activeSetIndex <= i + 1}
              isSavedMessages={isSavedMessages}
              isStatusPicker={isStatusPicker}
              isReactionPicker={isReactionPicker}
              shouldHideHeader={shouldHideHeader}
              withDefaultTopicIcon={withDefaultTopicIcons && isRecent}
              withDefaultStatusIcon={isStatusPicker && isRecent}
              isChatEmojiSet={isChatEmojiSet}
              isCurrentUserPremium={isCurrentUserPremium}
              selectedReactionIds={selectedReactionIds}
              availableReactions={availableReactions}
              isTranslucent={isTranslucent}
              onReactionSelect={onReactionSelect}
              onReactionContext={onReactionContext}
              onStickerSelect={onStickerSelect}
              onContextMenuOpen={onContextMenuOpen}
              onContextMenuClose={onContextMenuClose}
              onContextMenuClick={onContextMenuClick}
              forcePlayback
            />
          );
        })}
        {((query || selectedEmojiGroup) && onEmojiSelect) && allCategories.map((category, i) => (
          <EmojiCategory
            category={category}
            index={i}
            allEmojis={emojis}
            observeIntersection={observeIntersection}
            shouldRender={selectedEmojiGroup || (activeCategoryIndex >= i - 1 && activeCategoryIndex <= i + 1)}
            onEmojiSelect={handleEmojiSelect}
          />
        ))}
      </div>
    </div>
  );
};

async function ensureEmojiData() {
  if (!emojiDataPromise) {
    emojiDataPromise = import('emoji-data-ios/emoji-data.json');
    emojiRawData = (await emojiDataPromise).default;

    emojiData = uncompressEmoji(emojiRawData);
  }

  return emojiDataPromise;
}

export default memo(withGlobal<OwnProps>(
  (global, { chatId, isStatusPicker, isReactionPicker }): StateProps => {
    const {
      stickers: {
        setsById: stickerSetsById,
      },
      customEmojis: {
        byId: customEmojisById,
        featuredIds: customEmojiFeaturedIds,
        statusRecent: {
          emojis: recentStatusEmojis,
        },
      },
      recentCustomEmojis: recentCustomEmojiIds,
      reactions: {
        availableReactions,
        recentReactions,
        topReactions,
        defaultTags,
      },
    } = global;

    const isSavedMessages = Boolean(chatId && selectIsChatWithSelf(global, chatId));
    const chatFullInfo = chatId ? selectChatFullInfo(global, chatId) : undefined;

    const currentSearch = selectCurrentCustomEmojiSearch(global);
    const { query, group, resultIds } = currentSearch || {};
    const {
      language,
    } = global.settings.byKey;
    const baseEmojiKeywords = global.emojiKeywords[BASE_EMOJI_KEYWORD_LANG];
    const emojiKeywords = language !== BASE_EMOJI_KEYWORD_LANG ? global.emojiKeywords[language] : undefined;

    return {
      query,
      resultIds,
      emojiKeywords: emojiKeywords || baseEmojiKeywords,
      selectedEmojiGroup: group,
      customEmojisById: !isStatusPicker ? customEmojisById : undefined,
      recentCustomEmojiIds: !isStatusPicker ? recentCustomEmojiIds : undefined,
      recentStatusEmojis: isStatusPicker ? recentStatusEmojis : undefined,
      stickerSetsById,
      addedCustomEmojiIds: global.customEmojis.added.setIds,
      canAnimate: selectCanPlayAnimatedEmojis(global),
      isSavedMessages,
      isCurrentUserPremium: selectIsCurrentUserPremium(global),
      customEmojiFeaturedIds,
      defaultTopicIconsId: global.defaultTopicIconsId,
      defaultStatusIconsId: global.defaultStatusIconsId,
      topReactions: isReactionPicker ? topReactions : undefined,
      recentReactions: isReactionPicker ? recentReactions : undefined,
      chatEmojiSetId: chatFullInfo?.emojiSet?.id,
      isWithPaidReaction: isReactionPicker && chatFullInfo?.isPaidReactionAvailable,
      availableReactions: isReactionPicker ? availableReactions : undefined,
      defaultTagReactions: isReactionPicker ? defaultTags : undefined,
    };
  },
)(CustomEmojiPicker));
