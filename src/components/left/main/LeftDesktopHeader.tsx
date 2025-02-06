import type { FC } from '../../../lib/teact/teact';
import React, { memo, useMemo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { GlobalState } from '../../../global/types';
import type { ISettings } from '../../../types';
import { LeftColumnContent } from '../../../types';

import { APP_NAME, DEBUG, IS_BETA } from '../../../config';
import { selectIsCurrentUserPremium, selectTabState, selectTheme } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
// import captureEscKeyListener from '../../../util/captureEscKeyListener';
// import { formatDateToString } from '../../../util/dates/dateFormat';
import { IS_ELECTRON, IS_MAC_OS } from '../../../util/windowEnvironment';

import useAppLayout from '../../../hooks/useAppLayout';
// import useConnectionStatus from '../../../hooks/useConnectionStatus';
// import useElectronDrag from '../../../hooks/useElectronDrag';
import useFlag from '../../../hooks/useFlag';
// import { useHotkeys } from '../../../hooks/useHotkeys';
// import useLang from '../../../hooks/useLang';
// import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import { useFullscreenStatus } from '../../../hooks/window/useFullscreen';
import useLeftHeaderButtonRtlForumTransition from './hooks/useLeftHeaderButtonRtlForumTransition';

// import Icon from '../../common/icons/Icon';
// import PeerChip from '../../common/PeerChip';
// import StoryToggler from '../../story/StoryToggler';
import Button from '../../ui/Button';
import DropdownMenu from '../../ui/DropdownMenu';
// import SearchInput from '../../ui/SearchInput';
// import ShowTransition from '../../ui/ShowTransition';
// import ConnectionStatusOverlay from '../ConnectionStatusOverlay';
import LeftSideMenuItems from './LeftSideMenuItems';

import './LeftMainHeader.scss';

type OwnProps = {
  shouldHideSearch?: boolean;
  content: LeftColumnContent;
  shouldSkipTransition?: boolean;
  /**/onSearchQuery: (query: string) => void;
  onSelectSettings: NoneToVoidFunction;
  onSelectContacts: NoneToVoidFunction;
  onSelectArchived: NoneToVoidFunction;
  onReset: NoneToVoidFunction;
};

type StateProps =
  {
    isLoading: boolean;
    // globalSearchChatId?: string;
    searchDate?: number;
    theme: ISettings['theme'];
    // isMessageListOpen: boolean;
    // isCurrentUserPremium?: boolean;
    // isConnectionStatusMinimized: ISettings['isConnectionStatusMinimized'];
    areChatsLoaded?: boolean;
    // canSetPasscode?: boolean;
  }
  & Pick<GlobalState, 'connectionState' | 'isSyncing' | 'isFetchingDifference'>;

// const CLEAR_DATE_SEARCH_PARAM = {date: undefined};
// const CLEAR_CHAT_SEARCH_PARAM = {id: undefined};

const LeftDesktopHeader: FC<OwnProps & StateProps> = ({
  shouldHideSearch,
  content,
  // isCurrentUserPremium,
  shouldSkipTransition,
  // globalSearchChatId,
  // connectionState,
  // isSyncing,
  // isFetchingDifference,
  // isMessageListOpen,
  // isConnectionStatusMinimized,
  // areChatsLoaded,
  // canSetPasscode,
  // onSearchQuery,
  onSelectSettings,
  onSelectContacts,
  onSelectArchived,
  onReset,
}) => {

  const oldLang = useOldLang();
  const { isMobile, isDesktop } = useAppLayout();

  const [isBotMenuOpen, markBotMenuOpen, unmarkBotMenuOpen] = useFlag();

  const hasMenu = content === LeftColumnContent.ChatList;

  const MainButton: FC<{ onTrigger: () => void; isOpen?: boolean }> = useMemo(() => {
    return ({ onTrigger, isOpen }) => (
      <Button
        round
        ripple={hasMenu && !isMobile}
        size="smaller"
        color="translucent"
        className={buildClassName('LeftMainHeader__button', isOpen ? 'active' : '')}
        // eslint-disable-next-line react/jsx-no-bind
        onClick={hasMenu ? onTrigger : () => onReset()}
        ariaLabel={hasMenu ? oldLang('AccDescrOpenMenu2') : 'Return to chat list'}
      >
        <div className={buildClassName(
          'animated-menu-icon',
          !hasMenu && 'state-back',
          shouldSkipTransition && 'no-animation',
        )}
        />
      </Button>
    );
  }, [hasMenu, isMobile, oldLang, onReset, shouldSkipTransition]);

  const versionString = IS_BETA ? `${APP_VERSION} Beta (${APP_REVISION})` : (DEBUG ? APP_REVISION : APP_VERSION);

  const isFullscreen = useFullscreenStatus();

  // Disable dropdown menu RTL animation for resize
  const {
    shouldDisableDropdownMenuTransitionRef,
    handleDropdownMenuTransitionEnd,
  } = useLeftHeaderButtonRtlForumTransition(shouldHideSearch);

  return (
    <div id="LeftMainHeader" className={buildClassName('DropdownMenuContainer')}>
      {oldLang.isRtl && <div className="DropdownMenuFiller" />}
      <DropdownMenu
        trigger={MainButton}
        footer={`${APP_NAME} ${versionString}`}
        className={buildClassName(
          'main-menu',
          oldLang.isRtl && 'rtl',
          shouldHideSearch && oldLang.isRtl && 'right-aligned',
          shouldDisableDropdownMenuTransitionRef.current && oldLang.isRtl && 'disable-transition',
        )}
        forceOpen={isBotMenuOpen}
        positionX={shouldHideSearch && oldLang.isRtl ? 'right' : 'left'}
        transformOriginX={IS_ELECTRON && IS_MAC_OS && !isFullscreen ? 90 : undefined}
        onTransitionEnd={oldLang.isRtl ? handleDropdownMenuTransitionEnd : undefined}
      >
        <LeftSideMenuItems
          onSelectArchived={onSelectArchived}
          onSelectContacts={onSelectContacts}
          onSelectSettings={onSelectSettings}
          onBotMenuOpened={markBotMenuOpen}
          onBotMenuClosed={unmarkBotMenuOpen}
        />
      </DropdownMenu>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const tabState = selectTabState(global);
    const {
      fetchingStatus,
      // chatId,
    } = tabState.globalSearch;
    const {
      connectionState, isSyncing, isFetchingDifference,
    } = global;
    // const { isConnectionStatusMinimized } = global.settings.byKey;

    return {
      isLoading: fetchingStatus ? Boolean(fetchingStatus.chats || fetchingStatus.messages) : false,
      // globalSearchChatId: chatId,
      theme: selectTheme(global),
      connectionState,
      isSyncing,
      isFetchingDifference,
      // isMessageListOpen: Boolean(selectCurrentMessageList(global)),
      // isConnectionStatusMinimized,
      // isCurrentUserPremium: selectIsCurrentUserPremium(global),
      areChatsLoaded: Boolean(global.chats.listIds.active),
      // canSetPasscode: selectCanSetPasscode(global),
    };
  },
)(LeftDesktopHeader));
