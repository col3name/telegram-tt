import { FC, useCallback } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useMemo, useRef,
} from '../../../lib/teact/teact';
import { getActions, getGlobal, withGlobal } from '../../../global';

import {
  ApiChatFolder,
  ApiChatlistExportedInvite,
  ApiMessageEntityTypes,
  ApiSession,
} from '../../../api/types';
import type { GlobalState } from '../../../global/types';
import type { MenuItemContextAction } from '../../ui/ListItem';
import type { TabWithProperties } from '../../ui/TabList';

import { ALL_FOLDER_ID, PERSONAL_FOLDER_ID } from '../../../config';
import { selectCanShareFolder, selectTabState } from '../../../global/selectors';
import { selectCurrentLimit } from '../../../global/selectors/limits';
import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import { captureEvents, SwipeDirection } from '../../../util/captureEvents';
import { MEMO_EMPTY_ARRAY } from '../../../util/memo';
import { IS_TOUCH_ENV, MouseButton } from '../../../util/windowEnvironment';
import { renderTextWithEntities } from '../../common/helpers/renderTextWithEntities';
import renderText from '../../common/helpers/renderText';
import buildStyle from '../../../util/buildStyle';
import { removeEmoji } from '../../../util/emoji/removeEmoji';
import { FOLDER_ICONS } from '../../../hooks/reducers/useFoldersReducer';

import { useFolderManagerForUnreadCounters } from '../../../hooks/useFolderManager';
import useHistoryBack from '../../../hooks/useHistoryBack';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import useShowTransition from '../../../hooks/useShowTransition';
import { useFastClick } from '../../../hooks/useFastClick';
import useContextMenuHandlers from '../../../hooks/useContextMenuHandlers';
import { isCustomEmoji } from '../../../api/gramjs/apiBuilders/peers';
import { LeftColumnContent } from '../../../types';

import Menu from '../../ui/Menu';
import MenuSeparator from '../../ui/MenuSeparator';
import MenuItem from '../../ui/MenuItem';
import CustomEmoji from '../../common/CustomEmoji';
import Icon from '../../common/icons/Icon';

import styles from './ChatFoldersDesktop.module.scss';

type OwnProps = {
  content: LeftColumnContent;
  hideFolder: boolean;
  shouldHideFolderTabs?: boolean;
  isForumPanelOpen?: boolean;
  onReset: (event?: true | Event) => void;
};

type StateProps = {
  chatFoldersById: Record<number, ApiChatFolder>;
  folderInvitesById: Record<number, ApiChatlistExportedInvite[]>;
  orderedFolderIds?: number[];
  activeChatFolder: number;
  currentUserId?: string;
  shouldSkipHistoryAnimations?: boolean;
  maxFolders: number;
  maxChatLists: number;
  maxFolderInvites: number;
  hasArchivedChats?: boolean;
  hasArchivedStories?: boolean;
  archiveSettings: GlobalState['archiveSettings'];
  isStoryRibbonShown?: boolean;
  sessions?: Record<string, ApiSession>;
};

const SAVED_MESSAGES_HOTKEY = '0';
const FIRST_FOLDER_INDEX = 0;

type ChatFolderProps = {
  onClick: (index: number) => void;
  active: boolean;
  className?: string;
  clickArg: number;
  folder: TabWithProperties;
  contextActions?: MenuItemContextAction[];
  contextRootElementSelector?: string;
};

const classNames = {
  active: 'Tab--active',
  badgeActive: 'Tab__badge--active',
};

export const getCustomFolderIconName = (emoticon: string, docId?: string) : string => {
  if (!emoticon && !docId) {
    return 'folder-badge';
  }
  switch (emoticon) {
    case FOLDER_ICONS.BOT:
      return 'bot';
    case FOLDER_ICONS.CHATS:
      return 'chats';
    case FOLDER_ICONS.CHAT:
      return 'chat';
    case FOLDER_ICONS.STAR:
      return 'star-filled';
    case FOLDER_ICONS.PERSON:
      return 'user-filled';
    case FOLDER_ICONS.GROUP:
      return 'group-filled';
    case FOLDER_ICONS.FOLDER:
      return 'folder-badge';
    case FOLDER_ICONS.CHANNEL:
      return 'channel-filled';
    default:
      return 'folder-badge';
  }
};

const ChatFolder: FC<ChatFolderProps> = ({
  className,
  folder,
  active,
  onClick,
  clickArg,
  contextActions,
  contextRootElementSelector,
}) => {
  // eslint-disable-next-line no-null/no-null
  const tabRef = useRef<HTMLDivElement>(null);

  const {
    contextMenuAnchor, handleContextMenu, handleBeforeContextMenu, handleContextMenuClose,
    handleContextMenuHide, isContextMenuOpen,
  } = useContextMenuHandlers(tabRef, !contextActions);

  const { handleClick, handleMouseDown } = useFastClick((e: React.MouseEvent<HTMLDivElement>) => {
    if (contextActions && (e.button === MouseButton.Secondary || !onClick)) {
      // handleBeforeContextMenu(e);
    }

    if (e.type === 'mousedown' && e.button !== MouseButton.Main) {
      return;
    }

    onClick?.(clickArg!);
  });

  const getLayout = useLastCallback(() => ({ withPortal: true }));

  const getTriggerElement = useLastCallback(() => tabRef.current);
  const getRootElement = useLastCallback(
    () => (contextRootElementSelector ? tabRef.current!.closest(contextRootElementSelector) : document.body),
  );
  const getMenuElement = useLastCallback(
    () => document.querySelector('#portals')!.querySelector('.Tab-context-menu .bubble'),
  );

  const iconSize = 40;
  // console.log(folder)
  // const isAllChat = ALL_FOLDER_ID === folder.id;
  // const isPersonalChat = PERSONAL_FOLDER_ID === folder.id;

  // const customFolderIconName = isAllChat ? 'chats' : isPersonalChat ? folder.emoticon ? getCustomFolderIconName(folder.emoticon) : 'group' : folder.emoticon ? getCustomFolderIconName(folder.emoticon) : 'folder-badge';
  return (
    <div
      ref={tabRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      className={[styles.Tab, onClick && styles.TabInteractive, active && styles.TabActive].join(' ')}
      // className={buildClassName('Tab', onClick && 'Tab--interactive', className)}
      // className={buildClassName('FolderTab', active && 'Tab--active', 'Tab--folder', className)}
    >
      {/*{folder.emoticon === FOLDER_ICONS.BOT && (*/}
      {/*  <>*/}
      {/*    <Icon name="bot" />*/}
      {/*    /!*<span>itsbot {folder.emoticon}</span>*!/*/}
      {/*  </>*/}
      {/*)}*/}
      {/*{Object.keys(FOLDER_ICONS).includes(folder.emoticon) && (*/}
      {/*  <span>dfd{folder.emoticon}</span>*/}
      {/*)}*/}
      { folder.docId && (
        <CustomEmoji
          documentId={folder.docId}
          size={iconSize}
          style={buildStyle(
            iconSize !== undefined && `width: ${iconSize}px; height: ${iconSize}px;`,
          )}
        />
      )}
      {!folder.docId && (
        <>
          {folder.isCustomIcon ? (
            <Icon
              name={folder.customFolderIconName || 'folder-badge'}
              className={buildClassName(styles.ChatFoldersIcon, active && styles.ChatFoldersIconActive)}
            />
          ) : (
            <span
              className={buildClassName(styles.ChatFoldersEmoji, active && styles.ChatFoldersIconActive)}
            >
              {folder.emoticon}
            </span>
          )}
        </>
      )}

      <span className={styles.Tab_inner}>
        {typeof folder.title === 'string' ? renderText(folder.title, ['emoji', 'hq_emoji', 'emoji_html']) : folder.title}
        {/*{isBlocked && <Icon name="lock-badge" className="blocked" />}*/}
      </span>

      {Boolean(folder.badgeCount) && (
        <span className={buildClassName(styles.badge, active && styles.badgeActive)}>{folder.badgeCount}</span>
      )}
      {contextActions && contextMenuAnchor !== undefined && (
        <Menu
          isOpen={isContextMenuOpen}
          anchor={contextMenuAnchor}
          getTriggerElement={getTriggerElement}
          getRootElement={getRootElement}
          getMenuElement={getMenuElement}
          getLayout={getLayout}
          className="Tab-context-menu"
          autoClose
          onClose={handleContextMenuClose}
          onCloseAnimationEnd={handleContextMenuHide}
          withPortal
        >
          {contextActions.map((action) => (
            ('isSeparator' in action) ? (
              <MenuSeparator key={action.key || 'separator'} />
            ) : (
              <MenuItem
                key={action.title}
                icon={action.icon}
                destructive={action.destructive}
                disabled={!action.handler}
                onClick={action.handler}
              >
                {action.title}
              </MenuItem>
            )
          ))}
        </Menu>
      )}
    </div>
  );
};

export function getTitleIcon(title) {
  return title?.text?.slice(-2)?.match?.(/\p{RGI_Emoji}/vg);
}

export function isCustomFolderIcon(emoticon: string): boolean {
  return Object.values(FOLDER_ICONS).includes(emoticon);
}

const ChatFoldersDesktop: FC<OwnProps & StateProps> = ({
  // hideFolder,
  chatFoldersById,
  orderedFolderIds,
  activeChatFolder,
  currentUserId,
  isForumPanelOpen,
  // shouldSkipHistoryAnimations,
  maxFolders,
  maxChatLists,
  // shouldHideFolderTabs,
  folderInvitesById,
  maxFolderInvites,
  // hasArchivedChats,
  // hasArchivedStories,
  // archiveSettings,
  isStoryRibbonShown,
  // sessions,
  content,
  onReset,
}) => {
  const {
    loadChatFolders,
    setActiveChatFolder,
    openChat,
    openShareChatFolderModal,
    openDeleteChatFolderModal,
    openEditChatFolder,
    openLimitReachedModal,
  } = getActions();

  // console.log({ chatFoldersById });
  // eslint-disable-next-line no-null/no-null
  const transitionRef = useRef<HTMLDivElement>(null);

  const lang = useLang();

  useEffect(() => {
    loadChatFolders();
  }, []);

  const {
    ref,
    shouldRender: shouldRenderStoryRibbon,
    getIsClosing: getIsStoryRibbonClosing,
  } = useShowTransition({
    isOpen: isStoryRibbonShown,
    className: false,
    withShouldRender: true,
  });
  // const isStoryRibbonClosing = useDerivedState(getIsStoryRibbonClosing);

  const allChatsFolder: ApiChatFolder = useMemo(() => {
    return {
      id: ALL_FOLDER_ID,
      title: { text: orderedFolderIds?.[0] === ALL_FOLDER_ID ? lang('FilterAllChatsShort') : lang('FilterAllChats') },
      includedChatIds: MEMO_EMPTY_ARRAY,
      excludedChatIds: MEMO_EMPTY_ARRAY,
    } satisfies ApiChatFolder;
  }, [orderedFolderIds, lang]);

  const displayedFolders = useMemo(() => {
    return orderedFolderIds
      ? orderedFolderIds.map((id) => {
        if (id === ALL_FOLDER_ID) {
          return allChatsFolder;
        }

        return chatFoldersById[id] || {};
      }).filter(Boolean)
      : undefined;
  }, [chatFoldersById, allChatsFolder, orderedFolderIds]);

  // console.log({ chatFoldersById, allChatsFolder })
  const isInFirstFolder = FIRST_FOLDER_INDEX === activeChatFolder;

  const folderCountersById = useFolderManagerForUnreadCounters();
  const folderTabs = useMemo(() => {
    if (!displayedFolders || !displayedFolders.length) {
      return undefined;
    }

    return displayedFolders.map((folder, i) => {
      const { id, title } = folder;
      const isBlocked = id !== ALL_FOLDER_ID && i > maxFolders - 1;
      const canShareFolder = selectCanShareFolder(getGlobal(), id);
      const contextActions: MenuItemContextAction[] = [];

      if (canShareFolder) {
        contextActions.push({
          title: lang('FilterShare'),
          icon: 'link',
          handler: () => {
            const chatListCount = Object.values(chatFoldersById).reduce((acc, el) => acc + (el.isChatList ? 1 : 0), 0);
            if (chatListCount >= maxChatLists && !folder.isChatList) {
              openLimitReachedModal({
                limit: 'chatlistJoined',
              });
              return;
            }

            // Greater amount can be after premium downgrade
            if (folderInvitesById[id]?.length >= maxFolderInvites) {
              openLimitReachedModal({
                limit: 'chatlistInvites',
              });
              return;
            }

            openShareChatFolderModal({
              folderId: id,
            });
          },
        });
      }

      if (id !== ALL_FOLDER_ID) {
        contextActions.push({
          title: lang('FilterEdit'),
          icon: 'edit',
          handler: () => {
            openEditChatFolder({ folderId: id });
          },
        });

        contextActions.push({
          title: lang('FilterDelete'),
          icon: 'delete',
          destructive: true,
          handler: () => {
            openDeleteChatFolderModal({ folderId: id });
          },
        });
      }

      const emoji = title.entities?.find((entity) => entity.type === ApiMessageEntityTypes.CustomEmoji);
      const docId = isCustomEmoji(emoji) ? emoji?.documentId : undefined;
      const isAllChat = ALL_FOLDER_ID === folder.id;
      const isPersonalChat = PERSONAL_FOLDER_ID === folder.id;

      const customFolderIconName = isAllChat ? 'chats' : isPersonalChat ? folder.emoticon
        ? getCustomFolderIconName(folder.emoticon) : 'group' : folder.emoticon
        ? getCustomFolderIconName(folder.emoticon) : 'folder-badge';
      const titleIcon = getTitleIcon(title);
      const isCustomIcon = folder.emoticon ? isCustomFolderIcon(folder.emoticon) :  titleIcon?.[0] !== undefined ? false : true;

      // console.log({isCustomIcon, em: folder.emoticon, title: folder.title.text, titleIcon: titleIcon?.[0]})
      if (isCustomIcon && folder.emoticon) {
        // debugger;
      }
      if (
        title.text.includes('Yandex')
        // ||
        // title.text.includes('Telegram')
      ) {
        // console.log({ title });
        // console.log({ folder, title, id: docId, enitities: title.entities, number: emoji });
      }

      return {
        id,
        emoticon: folder.emoticon || titleIcon?.at?.(0),
        title: renderTextWithEntities({
          text: removeEmoji(title.text, folder?.emoticon),
          entities: [],
          emojiSize: 30,
          // entities: title.entities?.splice(0, (title.entities.length - 2) || 0),
          noCustomEmojiPlayback: folder.noTitleAnimations,
        }),
        docId,
        isCustomIcon,
        customFolderIconName,
        badgeCount: folderCountersById[id]?.chatsCount,
        isBadgeActive: Boolean(folderCountersById[id]?.notificationsCount),
        isBlocked,
        contextActions: contextActions?.length ? contextActions : undefined,
      } satisfies TabWithProperties;
    });
  }, [
    displayedFolders, maxFolders, folderCountersById, lang, chatFoldersById, maxChatLists, folderInvitesById,
    maxFolderInvites,
  ]);

  const handleSwitchTab = useLastCallback((index: number) => {
    setActiveChatFolder({ activeChatFolder: index }, { forceOnHeavyAnimation: true });
  });

  // Prevent `activeTab` pointing at non-existing folder after update
  useEffect(() => {
    if (!folderTabs?.length) {
      return;
    }

    if (activeChatFolder >= folderTabs.length) {
      setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX });
    }
  }, [activeChatFolder, folderTabs, setActiveChatFolder]);

  useEffect(() => {
    if (!IS_TOUCH_ENV || !folderTabs?.length || isForumPanelOpen) {
      return undefined;
    }

    return captureEvents(transitionRef.current!, {
      selectorToPreventScroll: '.chat-list',
      onSwipe: ((e, direction) => {
        if (direction === SwipeDirection.Left) {
          setActiveChatFolder(
            { activeChatFolder: Math.min(activeChatFolder + 1, folderTabs.length - 1) },
            { forceOnHeavyAnimation: true },
          );
          return true;
        } else if (direction === SwipeDirection.Right) {
          setActiveChatFolder({ activeChatFolder: Math.max(0, activeChatFolder - 1) }, { forceOnHeavyAnimation: true });
          return true;
        }

        return false;
      }),
    });
  }, [activeChatFolder, folderTabs, isForumPanelOpen, setActiveChatFolder]);

  const isNotInFirstFolderRef = useRef();
  isNotInFirstFolderRef.current = !isInFirstFolder;
  useEffect(() => (isNotInFirstFolderRef.current ? captureEscKeyListener(() => {
    if (isNotInFirstFolderRef.current) {
      setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX });
    }
  }) : undefined), [activeChatFolder, setActiveChatFolder]);

  useHistoryBack({
    isActive: !isInFirstFolder,
    onBack: () => setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX }, { forceOnHeavyAnimation: true }),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code.startsWith('Digit') && folderTabs) {
        const [, digit] = e.code.match(/Digit(\d)/) || [];
        if (!digit) return;

        if (digit === SAVED_MESSAGES_HOTKEY) {
          openChat({ id: currentUserId, shouldReplaceHistory: true });
          return;
        }

        const folder = Number(digit) - 1;
        if (folder > folderTabs.length - 1) return;

        setActiveChatFolder({ activeChatFolder: folder }, { forceOnHeavyAnimation: true });
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [currentUserId, folderTabs, openChat, setActiveChatFolder]);

  const {
    ref: placeholderRef,
    shouldRender: shouldRenderPlaceholder,
  } = useShowTransition({
    isOpen: !orderedFolderIds,
    noMountTransition: true,
    withShouldRender: true,
  });

  const shouldRenderFolders = folderTabs && folderTabs.length > 1;

  const hasMenu = content === LeftColumnContent.ChatList;
  const onClick = useCallback((index: number) => {
    if (!hasMenu) {
      onReset(true);
    }
    handleSwitchTab(index);
  }, [hasMenu, onReset, handleSwitchTab]);

  return (
    <div
      ref={ref}
      className={buildClassName(
        styles.ChatFolders,
        // shouldRenderFolders && shouldHideFolderTabs && 'ChatFolders--tabs-hidden',
      )}
    >
      {shouldRenderFolders ? (
        <div
          className={buildClassName(
            styles.ChatFoldersWrapper,
            // 'ChatFoldersWrapper',
            // shouldRenderFolders && shouldHideFolderTabs && 'ChatFoldersWrapper--tabs-hidden',
          )}
        >
          {folderTabs?.map((tab: TabWithProperties, i: number) => (
            <ChatFolder
              key={tab.id}
              active={activeChatFolder === i}
              folder={tab}
              onClick={onClick}
              clickArg={i}
              contextActions={tab.contextActions}
              contextRootElementSelector="#LeftMyColumn"
            />
          ))}
        </div>
        // <TabList
        //   contextRootElementSelector="#LeftColumn"
        //   tabs={folderTabs}
        //   activeTab={activeChatFolder}
        //   onSwitchTab={handleSwitchTab}
        // />
      ) : shouldRenderPlaceholder ? (
        <div ref={placeholderRef} className="tabs-placeholder" />
      ) : undefined}
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, ownProps): StateProps => {
    const {
      chatFolders: {
        byId: chatFoldersById,
        orderedIds: orderedFolderIds,
        invites: folderInvitesById,
      },
      chats: {
        listIds: {
          archived,
        },
      },
      stories: {
        orderedPeerIds: {
          archived: archivedStories,
        },
      },
      activeSessions: {
        byHash: sessions,
      },
      currentUserId,
      archiveSettings,
    } = global;
    const { shouldSkipHistoryAnimations, activeChatFolder } = selectTabState(global);
    const { storyViewer: { isRibbonShown: isStoryRibbonShown } } = selectTabState(global);

    // console.log({chatFoldersById, orderedFolderIds})
    return {
      ...ownProps,
      chatFoldersById,
      folderInvitesById,
      orderedFolderIds,
      activeChatFolder,
      currentUserId,
      // shouldSkipHistoryAnimations,
      hasArchivedChats: Boolean(archived?.length),
      hasArchivedStories: Boolean(archivedStories?.length),
      maxFolders: selectCurrentLimit(global, 'dialogFilters'),
      maxFolderInvites: selectCurrentLimit(global, 'chatlistInvites'),
      maxChatLists: selectCurrentLimit(global, 'chatlistJoined'),
      archiveSettings,
      isStoryRibbonShown,
      sessions,
    };
  },
)(ChatFoldersDesktop));
