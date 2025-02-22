import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useRef,
} from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiWallpaper } from '../../../api/types';
import type { ThemeKey } from '../../../types';
import { SettingsScreens, UPLOADING_WALLPAPER_SLUG } from '../../../types';

import { DARK_THEME_PATTERN_COLOR, DEFAULT_PATTERN_COLOR } from '../../../config';
import { selectTheme } from '../../../global/selectors';
import { getAverageColor, getPatternColor, rgb2hex } from '../../../util/colors';
import { validateFiles } from '../../../util/files';
import { throttle } from '../../../util/schedulers';
import { openSystemFilesDialog } from '../../../util/systemFilesDialog';
import buildClassName from '../../../util/buildClassName';

import useHistoryBack from '../../../hooks/useHistoryBack';
import useOldLang from '../../../hooks/useOldLang';

import Checkbox from '../../ui/Checkbox';
import ListItem from '../../ui/ListItem';
import Loading from '../../ui/Loading';
import WallpaperTile from './WallpaperTile';

import './SettingsGeneralBackground.scss';
import { maskImages } from '../../bgWallpaper/AnimatedBackground';

type OwnProps = {
  isActive?: boolean;
  onScreenSelect: (screen: SettingsScreens) => void;
  onReset: () => void;
};

type StateProps = {
  background?: string;
  isBlurred?: boolean;
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

  const handleWallPaperSelect = useCallback((slug: string) => {
    // console.log({slug, loadedWallpapers});
    setThemeSettings({ theme: themeRef.current!, background: slug, pattern: undefined });
    const currentWallpaper = loadedWallpapers && loadedWallpapers.find((wallpaper: ApiWallpaper) => wallpaper.slug === slug);
    // console.log({currentWallpaper});
    // debugger;
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

  const onSelectPattern = useCallback((newPattern: string) => {
    const colors: Record<string, string[]> = {
      animals: ['#dbddbb', '#6ba587', '#d5d88d', '#88b884'],
      beach: ['#fec496', '#dd6cb9', '#962fbf', '#4f5bd5'],
      astronaut_cats: ['#7ed281', '#e68896', '#73c4e6', '#e5a7eb'],
      cats_and_dogs: ['#85d685', '#67a3f2', '#8fe1d6', '#dceb92'],
      christmas: ['#efd359', '#e984d8', '#ac86ed', '#40cdde'],
      fantasy: ['#e8c06e', '#f29ebf', '#f0e486', '#eaa36e'],
      late_night_delight: ['#b9e2ff', '#eccbff', '#a2b4ff', '#daeacb'],
      magic: ['#f0c07a', '#afd677', '#e4d573', '#7fc289'],
      math: ['#6c8cd4', '#d4a7c9', '#b2b1ee', '#b2b1ee'],
      paris: ['#f7dd6d', '#e96caf', '#edac4c', '#a464f4'],
      games: ['#85d685', '#67a3f2', '#8fe1d6', '#dceb92'],
      snowflakes: ['#4f5bd5', '#962fbf', '#dd6cb9', '#fec496'],
      space: ['#fbd9e6', '#fb9ae5', '#d5f7ff', '#73caff'],
      star_wars: ['#8adbf2', '#888dec', '#e39fea', '#679ced'],
      sweets: ['#b0cdeb', '#9fb0ea', '#bbead5', '#b2e3dd'],
      tattoos: ['#ffc3b2', '#e2c0ff', '#ffe7b2', '#ffe7b2'],
      underwater_world: ['#97beeb', '#b1e9ea', '#c6b1ef', '#efb7dc'],
      zoo: ['#e4b2ea', '#8376c2', '#eab9d9', '#b493e6'],
      unicorn: ['#d1a3e2', '#edd594', '#e5a1d0', '#ecd893'],
    };

    const colors1 = newPattern in colors ? colors[newPattern] : undefined;
    // console.log({ colors1, newPattern });
    setThemeSettings({ theme: themeRef.current!, background: newPattern, pattern: newPattern, colors: colors1 });
  }, [setThemeSettings]);

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
          onChange={handleWallPaperBlurChange}
        />
      </div>

      {/*<div>{`Selected ${pattern}`}</div>*/}
      {loadedWallpapers ? (
        <div className="settings-wallpapers">
          {maskImages.map((value: string) => (
            <div
              key={value}
              className={buildClassName(
                'WallpaperTile',
                value === pattern && 'selected',
              )}
              onClick={() => onSelectPattern(value)}
            >
              {value}
            </div>
          ))}
          {loadedWallpapers.map((wallpaper) => (
            <WallpaperTile
              key={wallpaper.slug}
              wallpaper={wallpaper}
              theme={theme}
              isSelected={background === wallpaper.slug}
              onClick={handleWallPaperSelect}
            />
          ))}
        </div>
      ) : (
        <Loading />
      )}
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const theme = selectTheme(global);
    const { background, isBlurred, pattern } = global.settings.themes[theme] || {};
    const { loadedWallpapers } = global.settings;

    // console.log( global.settings.themes, loadedWallpapers);
    return {
      pattern,
      background,
      isBlurred,
      loadedWallpapers,
      theme,
    };
  },
)(SettingsGeneralBackground));
