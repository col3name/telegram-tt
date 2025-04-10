import { DEBUG } from '../config';
import type { ApiFormattedText } from '../api/types';

export const CLIPBOARD_ITEM_SUPPORTED = window.navigator.clipboard && window.ClipboardItem;
export const ATTR_PASSTED_API_FORMATTED_TEXT = 'data-entity-message';

const textCopyEl = document.createElement('textarea');
textCopyEl.setAttribute('readonly', '');
textCopyEl.tabIndex = -1;
textCopyEl.className = 'visually-hidden';

export const copyTextToClipboard = (str: string): void => {
  textCopyEl.value = str;
  document.body.appendChild(textCopyEl);
  const selection = document.getSelection();

  if (selection) {
    // Store previous selection
    const rangeToRestore = selection.rangeCount > 0 && selection.getRangeAt(0);
    textCopyEl.select();
    document.execCommand('copy');
    // Restore the original selection
    if (rangeToRestore) {
      selection.removeAllRanges();
      selection.addRange(rangeToRestore);
    }
  }

  document.body.removeChild(textCopyEl);
};

export const copyHtmlToClipboard = (html: string, text: string, formattedText: ApiFormattedText): void => {
  if (!window.navigator.clipboard?.write) {
    copyTextToClipboard(text);
    return;
  }
  const json = JSON.stringify(formattedText);
  const resultHtml = `<code ${ATTR_PASSTED_API_FORMATTED_TEXT}="1">${json}</code>${html}`;
  window.navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([resultHtml], { type: 'text/html' }),
    }),
  ]);
};

export const copyImageToClipboard = (imageUrl?: string) => {
  if (!imageUrl) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const imageEl = new Image();
  imageEl.onload = (e: Event) => {
    if (ctx && e.currentTarget) {
      const img = e.currentTarget as HTMLImageElement;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      canvas.toBlob(copyBlobToClipboard, 'image/png', 1);
    }
  };

  imageEl.src = imageUrl;
};

export const copyTextToClipboardFromPromise = async (
  getTextPromise: Promise<string | undefined>,
  onSuccess: NoneToVoidFunction,
  onFailure: NoneToVoidFunction,
) => {
  const copyTextToClipboardFallback = async () => {
    try {
      const text = await getTextPromise;
      if (text) {
        copyTextToClipboard(text);
      } else {
        onFailure();
      }
      return Boolean(text);
    } catch {
      onFailure();
      return false;
    }
  };
  if (!CLIPBOARD_ITEM_SUPPORTED || !navigator.clipboard.write) {
    if (await copyTextToClipboardFallback()) onSuccess();
    return;
  }
  try {
    let hasGetDataError = false;
    const rejectGetDataError = () => Promise.reject(new Error('GET_DATA_ERROR'));

    const clipboardTextItem = new ClipboardItem({
      'text/plain': getTextPromise.then((text) => text || rejectGetDataError()).catch(() => {
        hasGetDataError = true;
        return '';
      }),
    });
    await navigator.clipboard.write([clipboardTextItem]);
    if (hasGetDataError) {
      onFailure();
      return;
    }
  } catch {
    // Promises in ClipboardItem aren't supported in older Chrome versions
    if (!await copyTextToClipboardFallback()) return;
  }
  onSuccess();
};

async function copyBlobToClipboard(pngBlob: Blob | null) {
  if (!pngBlob || !CLIPBOARD_ITEM_SUPPORTED) {
    return;
  }

  try {
    await window.navigator.clipboard.write?.([
      new ClipboardItem({
        [pngBlob.type]: pngBlob,
      }),
    ]);
  } catch (error) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }
}
