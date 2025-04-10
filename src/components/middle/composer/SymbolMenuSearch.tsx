import React, { FC, memo, TeactNode, useRef, useState } from '../../../lib/teact/teact';
import { withGlobal } from '../../../global';

import type { ApiEmojiGroup } from '../../../api/types';
import type { IconName } from '../../../types/icons';
import buildClassName from '../../../util/buildClassName';
import buildStyle from '../../../util/buildStyle';

import styles from './StickerPicker.module.scss';

import SearchInput from '../../ui/SearchInput';
import Icon from '../../common/icons/Icon';
import CustomEmoji from '../../common/CustomEmoji';

type OwnProps = {
  withPremium?: boolean;
  canAnimate?: boolean;
  isLoading?: boolean;
  isFocused?: boolean;
  className?: string;
  query?: string;
  placeholder?: string;
  onBlur?: NoneToVoidFunction;
  onReset?: NoneToVoidFunction;
  onFocus?: NoneToVoidFunction;
  onChange?: (query: string) => void;
  onGroupClick: (props: { emoji: string; group: ApiEmojiGroup }) => void;
};

type StateProps = {
  query?: string;
  emojiGroups?: ApiEmojiGroup[];
  selectedGroup?: ApiEmojiGroup;
};

const emojiGroupIconMap = new Map<string, IconName>([
  ['❤', 'msg_emoji_heart'],
  ['👍', 'msg_emoji_like'],
  ['👎', 'msg_emoji_dislike'],
  ['🎉', 'msg_emoji_party'],
  ['😄', 'msg_emoji_haha'],
  ['😨', 'msg_emoji_omg'],
  ['😔', 'msg_emoji_sad'],
  ['😡', 'msg_emoji_angry'],
  ['😐', 'msg_emoji_neutral'],
  ['🤔', 'msg_emoji_what'],
  ['🤪', 'msg_emoji_tongue'],
  ['📂⭐️', 'star'],
]);

const iconSize = 24;

const SymbolMenuSearch: FC<OwnProps & StateProps> = ({
  query,
  withPremium = true,
  isFocused,
  emojiGroups,
  isLoading,
  selectedGroup,
  placeholder,
  onFocus,
  onBlur,
  onChange,
  onReset,
  onGroupClick,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  const [isShift, setIsShift] = useState<boolean>(false);

  const onScroll = (event) => {
    const scrollLeft = event.target.scrollLeft;
    const isScrolled = scrollLeft > 30;

    if (isShift !== isScrolled) {
      setIsShift(isScrolled);
    }
  };

  const handleEmojiGroupClick = (group: ApiEmojiGroup, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (group.iconEmojiId === selectedGroup?.iconEmojiId) {
      return;
    }
    let emoji = '😍';
    if (Array.isArray(group.emoticons) && group.emoticons?.length > 0) {
      emoji = group.emoticons.join('');
    }
    onGroupClick({ emoji, group });
    const container = searchInputRef.current;
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
    const isEmptyQuery = query === undefined || query.length === 0;
    if ((isEmptyQuery && !isFocused && Array.isArray(emojiGroups) && emojiGroups?.length > 0)) {
      return (
        <div className={styles.emojiGroupContainer}>
          {emojiGroups.map((group: ApiEmojiGroup, index: number) => {
            const emoticon = group?.emoticons?.at?.(0);
            const iconName = (
              emoticon && emojiGroupIconMap.has(emoticon)
            ) ? emojiGroupIconMap.get(emoticon) : 'msg_emoji_like';
            const isPremium = index === emojiGroups.length - 1;
            if (!withPremium && isPremium) {
              return undefined;
            }
            const shouldRenderPremium = withPremium && isPremium;
            return (
              <div
                key={group.title}
                className={buildClassName(
                  styles.emojiGroup,
                  selectedGroup?.title === group.title && styles.emojiGroupActive,
                  isPremium && styles.emojiGroupPremium,
                  styles.emojiGroupSticker,
                )}
                onClick={(event) => handleEmojiGroupClick(group, event)}
              >
                {shouldRenderPremium ? (
                  <Icon name="star" className={styles.icon} />
                ) : group.iconEmojiId ? (
                  <CustomEmoji
                    withTranslucentThumb
                    documentId={group.iconEmojiId}
                    size={iconSize}
                    style={buildStyle(
                      iconSize !== undefined && `width: ${iconSize}px; height: ${iconSize}px;margin-right: 4px;`,
                    )}
                  />
                ) : (
                  <Icon name={iconName || 'msg_emoji_heart'} className={styles.icon} />
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return undefined;
  };

  const handleResetSearch = () => {
    inputRef?.current?.blur?.();
    if (!isShift) {
      if (!selectedGroup && !isShift) {
        onBlur?.();
      }
      searchInputRef.current?.blur?.();
      onReset?.();

      searchInputRef.current?.scrollTo?.({ left: 0, behavior: 'smooth' });
      return;
    }
    searchInputRef.current?.scrollTo?.({ left: 0, behavior: 'smooth' });
    onReset?.();
  };
  const canClose = isFocused || Boolean(query && query.length > 0);
  return (
    <SearchInput
      ref={inputRef}
      containerRef={searchInputRef}
      canClose={canClose}
      value={query}
      withBackIcon={isShift || selectedGroup !== undefined}
      className={buildClassName(
        'EmojiPicker-search',
        styles.esgSearch,
        isFocused && styles.emojiGroupInputFocused,
      )}
      isLoading={isLoading}
      placeholder={placeholder}
      onBlur={onBlur}
      onFocus={onFocus}
      onChange={onChange}
      onReset={handleResetSearch}
      renderItems={renderEmojiGroups}
      onScroll={onScroll}
    />
  );
};

export default memo(withGlobal<OwnProps>(
  (global, ownProps): StateProps => {
    const {
      effect,
    } = global.stickers;

    return {
      ...ownProps,
      emojiGroups: effect.emojiGroups,
      selectedGroup: effect?.group,
    };
  },
)(SymbolMenuSearch));
