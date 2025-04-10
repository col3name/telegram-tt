import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useRef,
} from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiWallpaper } from '../../../api/types';
import type { ThemeKey } from '../../../types';
import { SettingsScreens, UPLOADING_WALLPAPER_SLUG } from '../../../types';

import { DARK_THEME_PATTERN_COLOR, DEFAULT_PATTERN_COLOR } from '../../../config';
import { getAverageColor, getPatternColor, rgb2hex } from '../../../util/colors';
import { validateFiles } from '../../../util/files';
import { throttle } from '../../../util/schedulers';
import { openSystemFilesDialog } from '../../../util/systemFilesDialog';

import useHistoryBack from '../../../hooks/useHistoryBack';
import useOldLang from '../../../hooks/useOldLang';

import Checkbox from '../../ui/Checkbox';
import ListItem from '../../ui/ListItem';
import Loading from '../../ui/Loading';
import WallpaperTile from './WallpaperTile';
import Image1 from '../../../assets/wallpapers/web.telegram.org_k_ (1).png';
import Image2 from '../../../assets/wallpapers/web.telegram.org_k_ (2).png';
import Image3 from '../../../assets/wallpapers/web.telegram.org_k_ (3).png';
import Image4 from '../../../assets/wallpapers/web.telegram.org_k_ (4).png';
import Image5 from '../../../assets/wallpapers/web.telegram.org_k_ (5).png';
import Image6 from '../../../assets/wallpapers/web.telegram.org_k_ (6).png';
import Image7 from '../../../assets/wallpapers/web.telegram.org_k_ (7).png';
import Image8 from '../../../assets/wallpapers/web.telegram.org_k_ (8).png';
import Image9 from '../../../assets/wallpapers/web.telegram.org_k_ (9).png';
import Image10 from '../../../assets/wallpapers/web.telegram.org_k_ (10).png';
import Image11 from '../../../assets/wallpapers/web.telegram.org_k_ (11).png';
import Image12 from '../../../assets/wallpapers/web.telegram.org_k_ (12).png';
import Image13 from '../../../assets/wallpapers/web.telegram.org_k_ (13).png';
import Image14 from '../../../assets/wallpapers/web.telegram.org_k_ (14).png';
import Image15 from '../../../assets/wallpapers/web.telegram.org_k_ (15).png';
import Image16 from '../../../assets/wallpapers/web.telegram.org_k_ (16).png';
import Image17 from '../../../assets/wallpapers/web.telegram.org_k_ (17).png';
import Image18 from '../../../assets/wallpapers/web.telegram.org_k_ (18).png';
import Image19 from '../../../assets/wallpapers/web.telegram.org_k_ (19).png';
import Image20 from '../../../assets/wallpapers/web.telegram.org_k_ (20).png';
import Image21 from '../../../assets/wallpapers/web.telegram.org_k_ (21).png';
import Image22 from '../../../assets/wallpapers/web.telegram.org_k_ (22).png';
import Image23 from '../../../assets/wallpapers/web.telegram.org_k_ (23).png';
import Image24 from '../../../assets/wallpapers/web.telegram.org_k_ (24).png';

const images = [
  Image1, Image2, Image3, Image4, Image5, Image6, Image7, Image8,
  Image9, Image10, Image11, Image12, Image13, Image14, Image15, Image16,
  Image17, Image18, Image19, Image20, Image21, Image22, Image23, Image24,
];

import './SettingsGeneralBackground.scss';

type OwnProps = {
  isActive?: boolean;
  onScreenSelect: (screen: SettingsScreens) => void;
  onReset: () => void;
};

type StateProps = {
  background?: string;
  isBlurred?: boolean;
  docId?: number;
  isDark?: boolean;
  loadedWallpapers?: ApiWallpaper[];
  theme: ThemeKey;
  pattern?: string;
};

const SUPPORTED_TYPES = 'image/jpeg';

const runThrottled = throttle((cb) => cb(), 60000, true);

const SettingsGeneralBackground: FC<OwnProps & StateProps> = ({
  isActive,
  onScreenSelect,
  onReset,
  pattern,
  background,
  docId,
  isBlurred,
  loadedWallpapers,
  theme,
}) => {
  const {
    loadWallpapers,
    uploadWallpaper,
    setThemeSettings,
  } = getActions();

  const themeRef = useRef<ThemeKey>();
  themeRef.current = theme;
  // Due to the parent Transition, this component never gets unmounted,
  // that's why we use throttled API call on every update.
  useEffect(() => {
    runThrottled(() => {
      loadWallpapers();
    });
  }, [loadWallpapers]);

  const handleFileSelect = useCallback((e: Event) => {
    const { files } = e.target as HTMLInputElement;

    const validatedFiles = validateFiles(files);
    if (validatedFiles?.length) {
      uploadWallpaper(validatedFiles[0]);
    }
  }, [uploadWallpaper]);

  const handleUploadWallpaper = useCallback(() => {
    openSystemFilesDialog(SUPPORTED_TYPES, handleFileSelect, true);
  }, [handleFileSelect]);

  const handleSetColor = useCallback(() => {
    onScreenSelect(SettingsScreens.GeneralChatBackgroundColor);
  }, [onScreenSelect]);

  const handleResetToDefault = useCallback(() => {
    setThemeSettings({
      theme,
      background: undefined,
      backgroundColor: undefined,
      isBlurred: true,
      pattern: undefined,
      colors: undefined,
      patternColor: theme === 'dark' ? DARK_THEME_PATTERN_COLOR : DEFAULT_PATTERN_COLOR,
    });
  }, [setThemeSettings, theme]);

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

  const handleWallPaperBlurChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setThemeSettings({ theme: themeRef.current!, isBlurred: e.target.checked });
  }, [setThemeSettings]);

  const lang = useOldLang();

  useHistoryBack({
    isActive,
    onBack: onReset,
  });

  const isUploading = loadedWallpapers?.[0] && loadedWallpapers[0].slug === UPLOADING_WALLPAPER_SLUG;

  return (
    <div className="SettingsGeneralBackground settings-content custom-scroll">
      <div className="settings-item pt-3">
        <ListItem
          icon="camera-add"
          className="mb-0"
          disabled={isUploading}
          onClick={handleUploadWallpaper}
        >
          {lang('UploadImage')}
        </ListItem>

        <ListItem
          icon="colorize"
          className="mb-0"
          onClick={handleSetColor}
        >
          {lang('SetColor')}
        </ListItem>

        <ListItem icon="favorite" onClick={handleResetToDefault}>
          {lang('ThemeResetToDefaults')}
        </ListItem>

        <Checkbox
          label={lang('BackgroundBlurred')}
          checked={Boolean(isBlurred)}
          disabled={docId !== undefined}
          onChange={handleWallPaperBlurChange}
        />
      </div>
      {loadedWallpapers ? (
        <div className="settings-wallpapers">
          {loadedWallpapers.map((wallpaper: ApiWallpaper, index: number) => {
            if (index === 5 || index === 13 || index === 16) {
              return undefined;
            }
            if (wallpaper.isPattern && 'patternIndex' in wallpaper && wallpaper.patternIndex >= 16) {
              return undefined;
            }
            const image = (wallpaper.isPattern && 'patternIndex' in wallpaper && wallpaper.patternIndex < images.length && wallpaper.patternIndex <= 16)
              ? images[wallpaper.patternIndex] : undefined;
            return (
              <WallpaperTile
                imageSrc={image}
                key={wallpaper?.document?.id + wallpaper.slug + ':' + index}
                wallpaper={wallpaper}
                theme={theme}
                isSelected={background === wallpaper.slug && docId === index}
                onClick={(slug) => handleWallPaperSelect(slug, index)}
              />
            );
          })}
        </div>
      ) : (
        <Loading />
      )}
    </div>
  );
};

function getWallpapers(loadedWallpapers: ApiWallpaper[]) {
  let patternIndex = 0;
  return loadedWallpapers?.map((it) => {
    const isPattern = it.document.mimeType === 'application/x-tgwallpattern';
    const result = { ...it, isPattern: isPattern, patternIndex };
    if (isPattern) {
      patternIndex++;
    }
    return result;
  }, []);
}

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    // const theme = selectTheme(global);
    const { theme } = global.settings.byKey;
    const { background, docId, isBlurred, pattern, intencity } = global.settings.themes[theme] || {};
    const { loadedWallpapers } = global.settings;

    return {
      pattern,
      background,
      docId,
      isBlurred,
      isDark: intencity < 0,
      loadedWallpapers: getWallpapers(loadedWallpapers),
      theme,
    };
  },
)(SettingsGeneralBackground));
