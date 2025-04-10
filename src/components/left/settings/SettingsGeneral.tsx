import {FC, useRef} from '../../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useState,
} from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type {ISettings, ThemeKey, TimeFormat} from '../../../types';
import type { IRadioOption } from '../../ui/RadioGroup';
import type {ApiSticker, ApiWallpaper} from '../../../api/types';
import { SettingsScreens } from '../../../types';

import { selectLoadedTgWallpapers } from '../../../global/selectors';
import { pick } from '../../../util/iteratees';
import { setTimeFormat } from '../../../util/oldLangProvider';
import { getSystemTheme } from '../../../util/systemTheme';
import { getAverageColor, getPatternColor, rgb2hex } from '../../../util/colors';
import {
  IS_ANDROID, IS_ELECTRON, IS_IOS, IS_MAC_OS, IS_WINDOWS,
} from '../../../util/windowEnvironment';
import buildClassName from '../../../util/buildClassName';

import useAppLayout from '../../../hooks/useAppLayout';
import useHistoryBack from '../../../hooks/useHistoryBack';
import useLang from '../../../hooks/useLang';

import Checkbox from '../../ui/Checkbox';
import ListItem from '../../ui/ListItem';
import RadioGroup from '../../ui/RadioGroup';
import RangeSlider from '../../ui/RangeSlider';
import StickerView from '../../common/StickerView';

import styles from './SettingsGeneral.module.scss';

const MAX_WALLPAPERS = 8;

import Image1 from '../../../assets/wallpapers/web.telegram.org_k_ (1).png';
import Image2 from '../../../assets/wallpapers/web.telegram.org_k_ (2).png';
import Image3 from '../../../assets/wallpapers/web.telegram.org_k_ (3).png';
import Image4 from '../../../assets/wallpapers/web.telegram.org_k_ (4).png';
import Image5 from '../../../assets/wallpapers/web.telegram.org_k_ (5).png';
import Image6 from '../../../assets/wallpapers/web.telegram.org_k_ (6).png';
import Image7 from '../../../assets/wallpapers/web.telegram.org_k_ (7).png';
import Image8 from '../../../assets/wallpapers/web.telegram.org_k_ (8).png';
import Image9 from '../../../assets/wallpapers/web.telegram.org_k_ (9).png';

const images = [
  Image1, Image2, Image3, Image4, Image5, Image6, Image7, Image8, Image9,
];

const emojies = [
  '🐥',
  '🏠',
  '⛄' ,
  '💎' ,
  '👨‍🏫' ,
  '🌷' ,
  '💜' ,
  '🎄' ,
  '🎮' ,
]
const themeEmojiMap = {
  '🐥' : '4906730862705378010',
  '🏠': '4909228789914927963',
  '⛄' : '4913494396814492274',
  '💎' : '4907219728767910669',
  '👨‍🏫' : '5089629605464113924',
  '🌷' : '4907174300898820817',
  '💜' : '4909103449884328658',
  '🎄' : '4906829303355802062',
  '🎮' : '4909364218823705430',
};

interface CustomEmojiRendererProps {
  sticker: any;
  iconSize: number;
  imageSrc: string;
  sharedCanvasRef: any;
  containerRef?: any;
  shouldRenderEffect?: boolean;
  mediaHashEffect?: string;
  effectBlobUrl?: string;
  isMirrored?: boolean;
  width?: number;
  handleEffectEnded?: () => void;
}

const CustomEmojiRenderer = ({
  sticker,
  iconSize,
  // sharedCanvasRef,
  containerRef,
  shouldRenderEffect = false,
  mediaHashEffect,
  effectBlobUrl,
  imageSrc,
  isMirrored = false,
  width = 100,
  handleEffectEnded,
}: CustomEmojiRendererProps) => {
  const localContainerRef = useRef(null);
  const sharedCanvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div
      ref={containerRef || localContainerRef}
      style={`width: ${iconSize}px; height: ${iconSize}px;`}
    >
      <canvas ref={sharedCanvasRef} className="shared-canvas" />,
      {/* Render the sticker */}
      <StickerView
        sticker={sticker}
        isSmall
        size={48}
        shouldPreloadPreview
        noVideoOnMobile
        withSharedAnimation
        sharedCanvasRef={sharedCanvasRef}
        containerRef={containerRef || localContainerRef}
      />
    </div>
  );
};

type OwnProps = {
  isActive?: boolean;
  onScreenSelect: (screen: SettingsScreens) => void;
  onReset: () => void;
};

type StateProps =
  Pick<ISettings, (
    'messageTextSize' |
    'animationLevel' |
    'messageSendKeyCombo' |
    'timeFormat'
  )> & {
    background?: string;
    docId?: number;
    animatedEmojis?: ApiSticker[];
    loadedWallpapers?: ApiWallpaper[];
    theme: ISettings['theme'];
    shouldUseSystemTheme: boolean;
  };

const SettingsGeneral: FC<OwnProps & StateProps> = ({
  isActive,
  docId,
  background,
  animatedEmojis,
  loadedWallpapers,
  onScreenSelect,
  onReset,
  messageTextSize,
  messageSendKeyCombo,
  timeFormat,
  theme,
  shouldUseSystemTheme,
}) => {
  const {
    setThemeSettings,
    setSettingOption,
  } = getActions();
  const themeRef = useRef<ThemeKey>();
  themeRef.current = theme;

  const lang = useLang();

  const { isMobile } = useAppLayout();
  const isMobileDevice = isMobile && (IS_IOS || IS_ANDROID);

  const timeFormatOptions: IRadioOption[] = [{
    label: lang('SettingsTimeFormat12'),
    value: '12h',
  }, {
    label: lang('SettingsTimeFormat24'),
    value: '24h',
  }];

  const appearanceThemeOptions: IRadioOption[] = [{
    label: lang('EmptyChatAppearanceLight'),
    value: 'light',
  }, {
    label: lang('EmptyChatAppearanceDark'),
    value: 'dark',
  }, {
    label: lang('EmptyChatAppearanceSystem'),
    value: 'auto',
  }];

  const keyboardSendOptions = !isMobileDevice ? [
    { value: 'enter', label: lang('SettingsSendEnter'), subLabel: lang('SettingsSendEnterDescription') },
    {
      value: 'ctrl-enter',
      label: lang(IS_MAC_OS || IS_IOS ? 'SettingsSendCmdenter' : 'SettingsSendCtrlenter'),
      subLabel: lang('SettingsSendPlusEnterDescription'),
    },
  ] : undefined;

  const handleMessageTextSizeChange = useCallback((newSize: number) => {
    document.documentElement.style.setProperty(
      '--composer-text-size', `${Math.max(newSize, IS_IOS ? 16 : 15)}px`,
    );
    document.documentElement.style.setProperty('--message-meta-height', `${Math.floor(newSize * 1.3125)}px`);
    document.documentElement.style.setProperty('--message-text-size', `${newSize}px`);
    document.documentElement.setAttribute('data-message-text-size', newSize.toString());

    setSettingOption({ messageTextSize: newSize });
  }, [setSettingOption]);

  const handleAppearanceThemeChange = useCallback((value: string) => {
    const newTheme = value === 'auto' ? getSystemTheme() : value as ISettings['theme'];

    setSettingOption({ theme: newTheme });
    setSettingOption({ shouldUseSystemTheme: value === 'auto' });
  }, [setSettingOption]);

  const handleTimeFormatChange = useCallback((newTimeFormat: string) => {
    setSettingOption({ timeFormat: newTimeFormat as TimeFormat });
    setSettingOption({ wasTimeFormatSetManually: true });

    setTimeFormat(newTimeFormat as TimeFormat);
  }, [setSettingOption]);

  const handleMessageSendComboChange = useCallback((newCombo: string) => {
    setSettingOption({ messageSendKeyCombo: newCombo as ISettings['messageSendKeyCombo'] });
  }, [setSettingOption]);

  const [isTrayIconEnabled, setIsTrayIconEnabled] = useState(false);
  useEffect(() => {
    window.electron?.getIsTrayIconEnabled().then(setIsTrayIconEnabled);
  }, []);

  const handleIsTrayIconEnabledChange = useCallback((isChecked: boolean) => {
    window.electron?.setIsTrayIconEnabled(isChecked);
  }, []);

  const handleWallPaperSelect = useCallback((slug: string, index: number) => {
    setThemeSettings({ theme: themeRef.current!, background: slug, docId: undefined, pattern: undefined });
    const currentWallpaper: ApiWallpaper | undefined = loadedWallpapers && loadedWallpapers?.[index];;
    if (currentWallpaper?.document.mimeType === 'application/x-tgwallpattern') {
      const stg = currentWallpaper.settings;
      const colors1 = [
        stg?.backgroundColor, stg?.secondBackgroundColor,
        stg?.thirdBackgroundColor, stg?.fourthBackgroundColor,
      ];
      setThemeSettings({
        intencity: stg?.intensity || 40,
        theme: themeRef.current!, background: slug,
        pattern: slug,
        isBlurred: true,
        docId: index,
        colors: colors1,
      });
      return;
    }
    if (currentWallpaper?.document.thumbnail) {
      getAverageColor(currentWallpaper.document.thumbnail.dataUri)
        .then((color) => {
          const patternColor = getPatternColor(color);
          const rgbColor = `#${rgb2hex(color)}`;
          setThemeSettings({ theme: themeRef.current!, backgroundColor: rgbColor, patternColor });
        });
    }
  }, [loadedWallpapers, setThemeSettings]);

  useHistoryBack({
    isActive,
    onBack: onReset,
  });
  // const sharedCanvasRef = useRef<HTMLCanvasElement>(null);
  // const sharedCanvasHqRef = useRef<HTMLCanvasElement>(null);
  // const containerRef = useRef<HTMLCanvasElement>(null);
  // const iconSize = 48;
  return (
    <div className={buildClassName(styles.SettingsGeneral, 'settings-content custom-scroll')}>
      <div className="settings-item pt-3">
        <h4 className="settings-item-header" dir={lang.isRtl ? 'rtl' : undefined}>{lang('Settings')}</h4>

        <RangeSlider
          label={lang('TextSize')}
          min={12}
          max={20}
          value={messageTextSize}
          onChange={handleMessageTextSizeChange}
        />

        <ListItem
          icon="photo"
          narrow
          // eslint-disable-next-line react/jsx-no-bind
          onClick={() => onScreenSelect(SettingsScreens.GeneralChatBackground)}
        >
          {lang('ChatBackground')}
        </ListItem>

        {IS_ELECTRON && IS_WINDOWS && (
          <Checkbox
            label={lang('SettingsTray')}
            checked={Boolean(isTrayIconEnabled)}
            onCheck={handleIsTrayIconEnabledChange}
          />
        )}
      </div>

      <div className="settings-item">
        <h4 className="settings-item-header" dir={lang.isRtl ? 'rtl' : undefined}>
          {lang('Theme')}
        </h4>
        <div className={styles.settingsWallpapersWrapper}>
          <div className={styles.settingsWallpapersContainer}>
            {/*<canvas ref={sharedCanvasRef} className="shared-canvas" />*/}
            {/*<canvas ref={sharedCanvasHqRef} className="shared-canvas" />,*/}
            {loadedWallpapers?.map((wallpaper, index) => {
              if (index === 5) {
                return undefined;
              }
              const sticker: ApiSticker = animatedEmojis[index];
              const isSelected = background === wallpaper.slug && docId === index;
              return (
                <div
                  key={sticker.id}
                  className={buildClassName(
                    styles.settingsWallpapersItem,
                    isSelected && styles.settingsWallpapersItemSelected,
                  )}
                  style={`background-image: url(${images[index]});position: relative; ${isSelected ? ';' : ''}`}
                  onClick={() => handleWallPaperSelect(wallpaper.slug, index)}
                >
                  <img src={images[index]} className={styles.settingsWallpapersImage} />
                  <p
                    className={styles.settingsWallpapersEmoji}
                    style={isSelected ? 'transform: scale(1.4);' : ''}
                  >
                    {emojies[index]}
                  </p>
                  {/*<CustomEmojiRenderer*/}
                  {/*  sticker={sticker}*/}
                  {/*  iconSize={64}*/}
                  {/*  imageSrc={images[index]}*/}
                  {/*  sharedCanvasRef={sharedCanvasRef}*/}
                  {/*  // shouldRenderEffect={true}*/}
                  {/*  mediaHashEffect="effect-hash"*/}
                  {/*  // effectBlobUrl="/path/to/effect.tgs"*/}
                  {/*  // isMirrored={true}*/}
                  {/*  width={120}*/}
                  {/*  // handleEffectEnded={() => console.log('Effect ended')}*/}
                  {/*/>*/}
                </div>
              );
            })}
          </div>
        </div>
        <RadioGroup
          name="theme"
          options={appearanceThemeOptions}
          selected={shouldUseSystemTheme ? 'auto' : theme}
          onChange={handleAppearanceThemeChange}
        />
      </div>

      <div className="settings-item">
        <h4 className="settings-item-header" dir={lang.isRtl ? 'rtl' : undefined}>
          {lang('SettingsTimeFormat')}
        </h4>
        <RadioGroup
          name="timeformat"
          options={timeFormatOptions}
          selected={timeFormat}
          onChange={handleTimeFormatChange}
        />
      </div>

      {keyboardSendOptions && (
        <div className="settings-item">
          <h4 className="settings-item-header" dir={lang.isRtl ? 'rtl' : undefined}>{lang('SettingsKeyboard')}</h4>

          <RadioGroup
            name="keyboard-send-settings"
            options={keyboardSendOptions}
            onChange={handleMessageSendComboChange}
            selected={messageSendKeyCombo}
          />
        </div>
      )}
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const { theme, shouldUseSystemTheme } = global.settings.byKey;
    const { background, docId } = global.settings.themes[theme] || {};

    const loadedWallpapers = selectLoadedTgWallpapers(global);
    const { animatedEmojis } = global.settings;
    return {
      ...pick(global.settings.byKey, [
        'messageTextSize',
        'animationLevel',
        'messageSendKeyCombo',
        'isSensitiveEnabled',
        'canChangeSensitive',
        'timeFormat',
      ]),
      animatedEmojis,
      loadedWallpapers: loadedWallpapers.length > MAX_WALLPAPERS
        ? loadedWallpapers.slice(0, MAX_WALLPAPERS) : loadedWallpapers,
      theme,
      shouldUseSystemTheme,
      background,
      docId,
    };
  },
)(SettingsGeneral));
