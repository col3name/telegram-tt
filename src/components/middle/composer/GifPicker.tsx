import React, {
  memo, useEffect, useRef, FC, useCallback, TeactNode,
} from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiEmojiGroup, ApiVideo } from '../../../api/types';

import { SLIDE_TRANSITION_DURATION } from '../../../config';
import { selectCurrentGifSearch, selectCurrentMessageList, selectIsChatWithSelf } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import { IS_TOUCH_ENV } from '../../../util/windowEnvironment';

import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';
import useLastCallback from '../../../hooks/useLastCallback';
import useAsyncRendering from '../../right/hooks/useAsyncRendering';
import useOldLang from '../../../hooks/useOldLang';
import useFlag from '../../../hooks/useFlag';

import GifButton from '../../common/GifButton';
import Loading from '../../ui/Loading';
import SearchInput from '../../ui/SearchInput';
import Button from '../../ui/Button';
import Icon from '../../common/icons/Icon';

import './GifPicker.scss';
import styles from './StickerPicker.module.scss';

type OwnProps = {
  ref?: React.RefObject<HTMLDivElement>;
  className: string;
  loadAndPlay: boolean;
  canSendGifs?: boolean;
  onGifSelect?: (gif: ApiVideo, isSilent?: boolean, shouldSchedule?: boolean) => void;
};

type StateProps = {
  savedGifs?: ApiVideo[];
  isSavedMessages?: boolean;
  gifSearchQuery?: string;
  results?: ApiVideo[];
  emojiGroups?: ApiEmojiGroup[];
  selectedGroup?: ApiEmojiGroup | undefined;
};

const INTERSECTION_DEBOUNCE = 300;
// const PRELOAD_BACKWARDS = 96; // GIF Search bot results are multiplied by 24

const GifPicker: FC<OwnProps & StateProps> = ({
  ref,
  className,
  results,
  emojiGroups,
  loadAndPlay,
  canSendGifs,
  savedGifs,
  selectedGroup,
  isSavedMessages,
  gifSearchQuery,
  onGifSelect,
}) => {
  const {
    loadSavedGifs,
    saveGif,
    // searchMoreGifs,
    setGifSearchQuery,
    fetchEmojiGroups,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line no-null/no-null
  // eslint-disable-next-line no-null/no-null
  let containerRef = useRef<HTMLDivElement>(null);
  if (ref) {
    containerRef = ref;
  }
  const emojiGroupContainerRef = useRef<HTMLInputElement>(null);
  const fetched = useRef(false);

  const lang = useOldLang();
  const [isInputFocused, markInputFocused, unmarkInputFocused] = useFlag(false);

  const {
    observe: observeIntersection,
  } = useIntersectionObserver({ rootRef: containerRef, debounceMs: INTERSECTION_DEBOUNCE });
  //
  // const handleSearchMoreGifs = useCallback(() => {
  //   searchMoreGifs();
  // }, [searchMoreGifs]);

  useEffect(() => {
    if (loadAndPlay) {
      loadSavedGifs();
    }
  }, [loadAndPlay, loadSavedGifs]);

  useEffect(() => {
    try {
      if (fetched.current) {
        return;
      }
      fetchEmojiGroups({ premium: false });
    } finally {
      fetched.current = true;
    }
  }, []);

  const handleUnsaveClick = useLastCallback((gif: ApiVideo) => {
    saveGif({ gif, shouldUnsave: true });
  });

  const handleGifSearchQueryChange = useLastCallback((query: string) => {
    setGifSearchQuery({ query, onTab: false });
  });

  const onSelectRecent = useLastCallback(() => {
    setGifSearchQuery({ query: '', group: undefined, onTab: false });
    inputRef.current?.blur?.();
  });
  const onResetGiftSearchQuery = useCallback(() => {
    const hasSearchQuery = gifSearchQuery !== undefined && gifSearchQuery.length > 0;
    if (hasSearchQuery) {
      setGifSearchQuery({ query: '', group: undefined, onTab: false });
      return;
    }
    inputRef.current?.blur?.();
  }, [gifSearchQuery]);

  const canRenderContents = useAsyncRendering([], SLIDE_TRANSITION_DURATION);

  function renderContent() {
    if (gifSearchQuery === undefined) {
      return undefined;
    }

    if (!results) {
      return (
        <Loading />
      );
    }

    if (!results.length) {
      return (
        <p className="helper-text" dir="auto">{lang('NoGIFsFound')}</p>
      );
    }

    return results.map((gif) => (
      <GifButton
        key={gif.id}
        gif={gif}
        observeIntersection={observeIntersection}
        onClick={canSendGifs ? onGifSelect : undefined}
        isSavedMessages={isSavedMessages}
      />
    ));
  }
  // const hasResults = Boolean(gifSearchQuery !== undefined && results && results.length);
  const hasSearchQuery = (gifSearchQuery !== undefined && gifSearchQuery.length > 0) || isInputFocused;
  const handleEmojiGroupClick = (group: ApiEmojiGroup, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (group.iconEmojiId === selectedGroup?.iconEmojiId) {
      return;
    }
    let emoji = '😍';
    if (Array.isArray(group.emoticons) && group.emoticons?.length > 0) {
      emoji = group.emoticons.join('');
    }
    setGifSearchQuery({ query: emoji, group, onTab: false });
    const container = emojiGroupContainerRef.current;
    if (!container) {
      return;
    }
    const item = event.target;

    const itemRect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const itemCenterOffset = itemRect.left - containerRect.left;
    const scrollTo = itemCenterOffset - (container.offsetWidth - item.offsetWidth) / 2;

    container.scrollTo({
      left: container.scrollLeft + scrollTo,
      behavior: 'smooth',
    });
  };

  const renderEmojiGroups = (): TeactNode | undefined => {
    if (Array.isArray(emojiGroups) && emojiGroups?.length > 0) {
      return (
        <div
          ref={emojiGroupContainerRef}
          className={buildClassName(styles.emojiGroupContainer, 'GifPickerEmojiGroupContainer', 'no-scrollbar')}
        >
          <Button
            className={buildClassName(
              styles.emojiGroup,
              'GifPickerEmojiGroup',
              !selectedGroup && styles.emojiGroupActive,
            )}
            ariaLabel="favorite"
            color="translucent"
            // eslint-disable-next-line react/jsx-no-bind
            onClick={onSelectRecent}
          >
            <Icon name="recent" />
          </Button>
          {emojiGroups.map((group: ApiEmojiGroup, index: number) => {
            const emoticon = group?.emoticons?.at?.(0);
            return (
              <div
                key={group.title}
                className={buildClassName(
                  styles.emojiGroup,
                  'GifPickerEmojiGroup',
                  selectedGroup?.title === group.title && styles.emojiGroupActive,
                  index === emojiGroups.length - 1 && styles.emojiGroupPremium,
                )}
                onClick={(event) => handleEmojiGroupClick(group, event)}
              >
                {emoticon}
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className={styles.emojiGroupPlaceHolder} />
    );
  };
  const fullClassName = buildClassName(styles.root, 'EmojiPickerContainer', className);

  return (
    <div className={fullClassName}>
      {!isInputFocused && (
        renderEmojiGroups()
      )}
      <SearchInput
        ref={inputRef}
        canClose={hasSearchQuery}
        value={gifSearchQuery}
        className={buildClassName(
          'EmojiPicker-search',
          styles.esgSearch,
          isInputFocused && styles.emojiGroupInputFocused,
        )}
        placeholder={lang('SearchGifsTitle')}
        onChange={handleGifSearchQueryChange}
        onReset={onResetGiftSearchQuery}
        onBlur={unmarkInputFocused}
        onFocus={markInputFocused}
      />
      <div
        ref={containerRef}
        className={buildClassName('GifPicker',
          className,
          (results && !results.length) ? 'no-result' : undefined,
          IS_TOUCH_ENV ? 'no-scrollbar' : 'custom-scroll',
        )}
      >
        {(gifSearchQuery || selectedGroup) ? (
          renderContent()
          // <InfiniteScroll
          //   ref={containerRef}
          //   className={buildClassName('GifPicker', className, IS_TOUCH_ENV ? 'no-scrollbar' : 'custom-scroll')}
          //   // className={buildClassName('gif-container custom-scroll', hasResults && 'grid')}
          //   items={results}
          //   itemSelector=".GifButton"
          //   preloadBackwards={PRELOAD_BACKWARDS}
          //   noFastList
          //   // onLoadMore={handleSearchMoreGifs}
          // >
          //   {renderContent()}
          // </InfiniteScroll>
        ) : (
          // eslint-disable-next-line react/jsx-no-useless-fragment
          <>
            {!canSendGifs ? (
              <div className="picker-disabled">Sending GIFs is not allowed in this chat.</div>
            ) : canRenderContents && savedGifs && savedGifs.length ? (
              savedGifs.map((gif) => (
                <GifButton
                  key={gif.id}
                  gif={gif}
                  observeIntersection={observeIntersection}
                  isDisabled={!loadAndPlay}
                  onClick={canSendGifs ? onGifSelect : undefined}
                  onUnsaveClick={handleUnsaveClick}
                  isSavedMessages={isSavedMessages}
                />
              ))
            ) : canRenderContents && savedGifs ? (
              <div className="picker-disabled">No saved GIFs.</div>
            ) : (
              <Loading />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const { chatId } = selectCurrentMessageList(global) || {};
    const isSavedMessages = Boolean(chatId) && selectIsChatWithSelf(global, chatId);
    const { query: gifSearchQuery, results, group: selectedGroup } = selectCurrentGifSearch(global) || {};
    const { effect } = global.stickers;

    return {
      savedGifs: global.gifs.saved.gifs,
      isSavedMessages,
      gifSearchQuery: selectedGroup === undefined ? gifSearchQuery : '',
      selectedGroup,
      results,
      emojiGroups: effect.emojiGroups?.filter?.((group) => group.iconEmojiId !== 5269590556232664327),
    };
  },
)(GifPicker));
