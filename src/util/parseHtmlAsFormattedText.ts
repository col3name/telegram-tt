import type { ApiFormattedText, ApiMessageEntity } from '../api/types';
import { ApiMessageEntityTypes } from '../api/types';

import {
  convertMarkdownIntoApiFormattedText,
  parseHtmlAsApiFormattedText,
} from './parseMarkdown';

export const ENTITY_CLASS_BY_NODE_NAME: Record<string, ApiMessageEntityTypes> = {
  B: ApiMessageEntityTypes.Bold,
  STRONG: ApiMessageEntityTypes.Bold,
  I: ApiMessageEntityTypes.Italic,
  EM: ApiMessageEntityTypes.Italic,
  INS: ApiMessageEntityTypes.Underline,
  U: ApiMessageEntityTypes.Underline,
  S: ApiMessageEntityTypes.Strike,
  STRIKE: ApiMessageEntityTypes.Strike,
  DEL: ApiMessageEntityTypes.Strike,
  CODE: ApiMessageEntityTypes.Code,
  PRE: ApiMessageEntityTypes.Pre,
  BLOCKQUOTE: ApiMessageEntityTypes.Blockquote,
};

export default function parseHtmlAsFormattedText(
  html: string, withMarkdownLinks = false, skipMarkdown = false,
): ApiFormattedText {
  if (skipMarkdown) {
    return parseHtmlAsApiFormattedText(html, withMarkdownLinks);
  }
  const result = parseHtmlAsApiFormattedText(html, withMarkdownLinks);
  const apiFormattedText = convertMarkdownIntoApiFormattedText(result.text);
  return {
    text: apiFormattedText.text,
    entities: mergeEntities(result.entities || [], apiFormattedText.entities || []),
  };
}

function mergeEntities(lhs: ApiMessageEntity[], rhs: ApiMessageEntity[]): ApiMessageEntity[] {
  const combined = [...lhs, ...rhs];

  combined.sort((a, b) => a.offset - b.offset);

  return combined;
}

export function fixImageContent(fragment: HTMLDivElement) {
  fragment.querySelectorAll('img').forEach((node) => {
    if (node.dataset.documentId) { // Custom Emoji
      node.textContent = (node as HTMLImageElement).alt || '';
    } else { // Regular emoji with image fallback
      node.replaceWith(node.alt || '');
    }
  });
}
