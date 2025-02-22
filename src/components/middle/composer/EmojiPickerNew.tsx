import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useMemo,
  useRef, useState,
} from '../../../lib/teact/teact';
import { withGlobal } from '../../../global';

import type { GlobalState } from '../../../global/types';
import type { IconName } from '../../../types/icons';
import type {
  EmojiData,
  EmojiModule,
  EmojiRawData,
} from '../../../util/emoji/emoji';

import { MENU_TRANSITION_DURATION, RECENT_SYMBOL_SET_ID } from '../../../config';
import animateHorizontalScroll from '../../../util/animateHorizontalScroll';
import animateScroll from '../../../util/animateScroll';
import buildClassName from '../../../util/buildClassName';
import { uncompressEmoji } from '../../../util/emoji/emoji';
import { pick } from '../../../util/iteratees';
import { MEMO_EMPTY_ARRAY } from '../../../util/memo';
import { IS_TOUCH_ENV } from '../../../util/windowEnvironment';
import { REM } from '../../common/helpers/mediaDimensions';
import { FOLDER_ICONS_LIST } from '../../../hooks/reducers/useFoldersReducer';

import useAppLayout from '../../../hooks/useAppLayout';
import useHorizontalScroll from '../../../hooks/useHorizontalScroll';
import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useScrolledState from '../../../hooks/useScrolledState';
import { getCustomFolderIconName } from '../../left/main/ChatFoldersDesktop';
import useAsyncRendering from '../../right/hooks/useAsyncRendering';

import Icon from '../../common/icons/Icon';
import Button from '../../ui/Button';
import Loading from '../../ui/Loading';
import EmojiCategory from './EmojiCategory';
import SearchInput from '../../ui/SearchInput';

import './EmojiPicker.scss';

type OwnProps = {
  className?: string;
  isFolder?: boolean;
  onEmojiSelect: (emoji: string, name: string) => void;
};

type StateProps = Pick<GlobalState, 'recentEmojis'>;

type EmojiCategoryData = { id: string; name: string; emojis: string[] };

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

const OPEN_ANIMATION_DELAY = 200;
const SMOOTH_SCROLL_DISTANCE = 100;
const FOCUS_MARGIN = 3.25 * REM;
const HEADER_BUTTON_WIDTH = 2.625 * REM; // Includes margins
const INTERSECTION_THROTTLE = 200;

const categoryIntersections: boolean[] = [];

let emojiDataPromise: Promise<EmojiModule>;
let emojiRawData: EmojiRawData;
let emojiData: EmojiData;

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

const EmojiPickerNew: FC<OwnProps & StateProps> = ({
  className,
  recentEmojis,
  onEmojiSelect,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const headerRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<EmojiCategoryData[]>();
  const [emojis, setEmojis] = useState<AllEmojis>();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const { isMobile } = useAppLayout();
  const {
    handleScroll: handleContentScroll,
    isAtBeginning: shouldHideTopBorder,
  } = useScrolledState();

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
  });


  const canRenderContents = useAsyncRendering([], MENU_TRANSITION_DURATION);
  const shouldRenderContent = emojis && canRenderContents;

  useHorizontalScroll(headerRef, !(isMobile && shouldRenderContent));

  // Scroll header when active set updates
  useEffect(() => {
    if (!categories) {
      return;
    }

    const header = headerRef.current;
    if (!header) {
      return;
    }

    const newLeft = activeCategoryIndex * HEADER_BUTTON_WIDTH - header.offsetWidth / 2 + HEADER_BUTTON_WIDTH / 2;

    animateHorizontalScroll(header, newLeft);
  }, [categories, activeCategoryIndex]);

  const lang = useOldLang();

  const allCategories = useMemo(() => {
    if (!categories) {
      return MEMO_EMPTY_ARRAY;
    }
    const themeCategories: EmojiCategoryData[] = [...categories];
    if (recentEmojis?.length) {
      themeCategories.unshift({
        id: RECENT_SYMBOL_SET_ID,
        name: lang('RecentStickers'),
        emojis: recentEmojis,
      });
    }

    return themeCategories;
  }, [categories, lang, recentEmojis]);

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
  const [searchValue, setSearchValue] = useState('');

  const selectCategory = useLastCallback((index: number) => {
    setActiveCategoryIndex(index);
    const categoryEl = containerRef.current!.closest<HTMLElement>('.SymbolMenu-main')!
      .querySelector(`#emoji-category-${index}`)! as HTMLElement;
    animateScroll({
      container: containerRef.current!,
      element: categoryEl,
      position: 'start',
      margin: FOCUS_MARGIN,
      maxDistance: SMOOTH_SCROLL_DISTANCE,
    });
  });

  const handleEmojiSelect = useLastCallback((emoji: string, name: string) => {
    onEmojiSelect(emoji, name);
  });

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

  const containerClassName = buildClassName('EmojiPicker', className);

  if (!shouldRenderContent) {
    return (
      <div className={containerClassName}>
        <Loading />
      </div>
    );
  }

  const headerClassName = buildClassName(
    'EmojiPicker-header',
    !shouldHideTopBorder && 'with-top-border',
  );

  return (
    <div className={containerClassName}>
      <div
        ref={headerRef}
        className={headerClassName}
        dir={lang.isRtl ? 'rtl' : undefined}
      >
        {allCategories.map(renderCategoryButton)}
      </div>
      <div
        ref={containerRef}
        onScroll={handleContentScroll}
        className={buildClassName('EmojiPicker-main', IS_TOUCH_ENV ? 'no-scrollbar' : 'custom-scroll')}
      >
        <SearchInput
          className={buildClassName('EmojiPicker-search')}
          placeholder="Search Emoji"
          onChange={setSearchValue}
        />
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
                <Icon name={name} />
              </Button>
            );
          })}
        </div>

        {allCategories.map((category, i) => (
          <EmojiCategory
            category={category}
            index={i}
            allEmojis={searchEmoji(emojis, searchValue) as AllEmojis}
            observeIntersection={observeIntersection}
            shouldRender={activeCategoryIndex >= i - 1 && activeCategoryIndex <= i + 1}
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

    const data = uncompressEmoji(emojiRawData);
    console.log([data, emojiRawData]);
    emojiData = data;
  }

  return emojiDataPromise;
}

export default memo(withGlobal<OwnProps>(
  (global): StateProps => pick(global, ['recentEmojis']),
)(EmojiPickerNew));
