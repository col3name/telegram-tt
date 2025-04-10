import type { GlobalState } from '../types';
import type {ApiWallpaper} from "../../api/types";

export function selectNotifySettings<T extends GlobalState>(global: T) {
  return global.settings.byKey;
}

export function selectNotifyExceptions<T extends GlobalState>(global: T) {
  return global.settings.notifyExceptions;
}

export function selectLanguageCode<T extends GlobalState>(global: T) {
  return global.settings.byKey.language.replace('-raw', '');
}

export function selectCanSetPasscode<T extends GlobalState>(global: T) {
  return global.authRememberMe && global.isCacheApiSupported;
}

export function selectTranslationLanguage<T extends GlobalState>(global: T) {
  return global.settings.byKey.translationLanguage || selectLanguageCode(global);
}

export function selectNewNoncontactPeersRequirePremium<T extends GlobalState>(global: T) {
  return global.settings.byKey.shouldNewNonContactPeersRequirePremium;
}

export function selectShouldHideReadMarks<T extends GlobalState>(global: T) {
  return global.settings.byKey.shouldHideReadMarks;
}

export function selectLoadedTgWallpapers<T extends GlobalState>(global: T): ApiWallpaper[] {
  return (global.settings.loadedWallpapers || []).filter((wallpaper: ApiWallpaper) => (
    wallpaper.document.mimeType === 'application/x-tgwallpattern'
  ));
}
