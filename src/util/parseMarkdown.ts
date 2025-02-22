import {ApiFormattedText, ApiMessageEntity, ApiMessageEntityTypes} from '../api/types';

export function convertMarkdownIntoApiFormattedText(html: string): ApiFormattedText {
  // const value = cleanHtml(html);
  function parseEnclosedContent(value, startIndex, startDelimiter, endDelimiter) {
    const delimiterLength = startDelimiter.length;
    let i = startIndex + delimiterLength;

    while (i <= value.length - delimiterLength) {
      if (value.slice(i, i + delimiterLength) === endDelimiter) {
        return [value.slice(startIndex + delimiterLength, i), i + delimiterLength];
      }
      i++;
    }

    return [value.slice(startIndex + delimiterLength), value.length];
  }

  function parseEmoji(value, startIndex) {
    let i = startIndex + 1;

    // Parse the emoji shortname
    const shortnameStart = i;
    while (i < value.length && value[i] !== ':' && /[a-zA-Z0-9_]/.test(value[i])) {
      i++;
    }

    if (i >= value.length || value[i] !== ':') return undefined; // No closing ':'
    const shortname = value.slice(shortnameStart, i);

    return { shortname, endIndex: i + 1 };
  }

  function parseMention(value, startIndex) {
    let i = startIndex + 1;

    // Parse the username
    const usernameStart = i;
    while (i < value.length && /[a-zA-Z0-9_]/.test(value[i])) {
      i++;
    }

    if (i === usernameStart) {
      return undefined; // No valid username found
    }
    const username = value.slice(usernameStart, i);

    return { username, endIndex: i };
  }

  function parseHashtag(value, startIndex) {
    let i = startIndex + 1;

    // Parse the hashtag
    const tagStart = i;
    while (i < value.length && /[a-zA-Z0-9_]/.test(value[i])) {
      i++;
    }

    if (i === tagStart) {
      return undefined; // No valid hashtag found
    }
    const tag = value.slice(tagStart, i);

    return { tag, endIndex: i };
  }

  function parseCommand(value, startIndex) {
    let i = startIndex + 1;

    // Parse the command
    const commandStart = i;
    while (i < value.length && /[a-zA-Z0-9_]/.test(value[i])) {
      i++;
    }

    if (i === commandStart) return undefined; // No valid command found
    const command = value.slice(commandStart, i);

    // Check for optional bot name
    let bot;
    if (value[i] === '@' && i + 1 < value.length) {
      i++; // Skip '@'
      const botStart = i;
      while (i < value.length && /[a-zA-Z0-9_]/.test(value[i])) {
        i++;
      }
      if (i > botStart) {
        bot = value.slice(botStart, i);
      }
    }

    return { command, bot, endIndex: i };
  }

  function parseMarkdownAsAst(value, offset) {
    const tokens = [];
    let i = 0;

    while (i < value.length) {
      const char = value[i];

      if (char === '*') {
        // Check for bold or italic
        if (value[i + 1] === '*') {
          // Bold (**text**)
          const [content, endIndex] = parseEnclosedContent(value, i, '**', '**');
          tokens.push({type: 'bold', children: parseMarkdownAsAst(content, offset + i + 1), offset: offset + i});
          i = endIndex;
        } else {
          // Bold (*text*)
          const [content, endIndex] = parseEnclosedContent(value, i, '*', '*');
          tokens.push({type: 'bold', children: parseMarkdownAsAst(content, offset + i + 1), offset: offset + i});
          i = endIndex;
        }
      } else if (char === '_') {
        if (value[i + 1] === '_') {
          // underlined (__text__)
          const [content, endIndex] = parseEnclosedContent(value, i, '__', '__');
          tokens.push({type: 'underline', children: parseMarkdownAsAst(content, offset + i + 1), offset: offset + i});
          i = endIndex;
        } else {
          // Italic (_text_)
          const [content, endIndex] = parseEnclosedContent(value, i, '_', '_');
          tokens.push({type: 'italic', children: parseMarkdownAsAst(content, offset + i + 1), offset: offset + i});
          i = endIndex;
        }
      } else if (char === '`') {
        if (value[i + 1] === '`' && value[i + 2] === '`') {
          // Preformatted code block (```)
          const [content, endIndex] = parseEnclosedContent(value, i, '```', '```');
          tokens.push({type: 'pre', value: content, offset: offset + i + 2});
          i = endIndex;
        } else {
          // Inline code (`code`)
          const [content, endIndex] = parseEnclosedContent(value, i, '`', '`');
          tokens.push({type: 'code', value: content, offset: offset + i});
          i = endIndex;
        }
      } else if (char === '[') {
        // Link ([text](url)) or Custom Emoji
        if (value[i + 1] === ']') {
          tokens.push({type: 'text', value: char + value[i + 1]});
          i += 2;
        } else {
          const linkMatch = parseLinkOrCustomEmoji(value, i);
          if (linkMatch) {
            if (linkMatch.type === 'link') {
              const {value, url, endIndex} = linkMatch;
              tokens.push({type: 'link', value, url, offset: offset + i});
            } else if (linkMatch.type === 'custom_emoji') {
              const {id, value, endIndex} = linkMatch;
              tokens.push({type: 'custom_emoji', id, value, offset: offset + i});
            } else if (linkMatch.type === 'mention_user') {
              const {id, value,} = linkMatch;
              tokens.push({type: 'mention_user', id, value, offset: offset + i});
            }
            i = linkMatch.endIndex;
          } else {
            // Treat '[' as plain text
            tokens.push({type: 'text', value: char});
            i++;
          }
        }
      } else if (char === '~') {
        // Strikethrough (~text~)
        const [content, endIndex] = parseEnclosedContent(value, i, '~', '~');
        tokens.push({type: 'strikethrough', children: parseMarkdownAsAst(content, offset + i), offset: offset + i});
        i = endIndex;
      } else if (char === '-' && value[i + 1] === '-') {
        // Underline (--text--)
        const [content, endIndex] = parseEnclosedContent(value, i, '--', '--');
        tokens.push({type: 'underline', children: parseMarkdownAsAst(content, offset + i + 1), offset: offset + i});
        i = endIndex;
      } else if (char === '|' && value[i + 1] === '|') {
        // Spoiler (||text||)
        const [content, endIndex] = parseEnclosedContent(value, i, '||', '||');
        tokens.push({type: 'spoiler', children: parseMarkdownAsAst(content, offset + i + 1), offset: offset + endIndex});
        i = endIndex;
      } else if (char === ':') {
        // Custom emoji (:[emoji_shortname]:)
        const emojiMatch = parseEmoji(value, i);
        if (emojiMatch) {
          const {shortname, endIndex} = emojiMatch;
          tokens.push({type: 'emoji', shortname, offset: offset + i});
          i = endIndex;
        } else {
          // Treat ':' as plain text
          tokens.push({type: 'text', value: char, offset: offset + i});
          i++;
        }
      } else if (char === '>') {
        // Blockquote (> text)
        const blockquoteMatch = parseBlockquote(value, i, offset);
        if (blockquoteMatch) {
          const { children, endIndex } = blockquoteMatch;
          tokens.push({ type: 'blockquote', children, offset: offset + i });
          i = endIndex;
        } else {
          // Treat '>' as plain text
          tokens.push({type: 'text', value: char, offset: offset + i });
          i++;
        }
      } else if (char === '@') {
        // Mention (@username) or Email Address
        if (isMentionStart(value, i)) {
          const mentionMatch = parseMention(value, i);
          if (mentionMatch) {
            const { username, endIndex } = mentionMatch;
            tokens.push({ type: 'mention', value: username, offset: offset + i });
            i = endIndex;
          } else {
            // Treat '@' as plain text
            tokens.push({ type: 'text', value: char, offset: offset + i });
            i++;
          }
        } else {
          const emailMatch = parseEmail(value, i);
          if (emailMatch) {
            const {email, endIndex} = emailMatch;
            tokens.push({ type: 'email', value: email, offset: offset + i });
            i = endIndex;
          } else {
            // Treat '@' as plain text
            tokens.push({ type: 'text', value: char, offset: offset + i });
            i++;
          }
        }
      } else if (char === '#') {
        // Hashtag (#hashtag)
        const hashtagMatch = parseHashtag(value, i);
        if (hashtagMatch) {
          const {tag, endIndex} = hashtagMatch;
          tokens.push({type: 'hashtag', value: tag, offset: offset + i});
          i = endIndex;
        } else {
          // Treat '#' as plain text
          tokens.push({type: 'text', value: char, offset: offset + i});
          i++;
        }
      } else if (char === '/') {
        // Command (/command or /command@botname)
        const commandMatch = parseCommand(value, i);
        if (commandMatch) {
          const {command, bot, endIndex} = commandMatch;
          tokens.push({type: 'command', value: command, bot, offset: offset + i});
          i = endIndex;
        } else {
          // Treat '/' as plain text
          tokens.push({type: 'text', value: char, offset: offset + i});
          i++;
        }
      } else if (char === '$') {
        // Cashtag ($AAPL)
        const cashtagMatch = parseCashtag(value, i);
        if (cashtagMatch) {
          const {symbol, endIndex} = cashtagMatch;
          tokens.push({type: 'cashtag', value: symbol, offset: offset + i});
          i = endIndex;
        } else {
          // Treat '$' as plain text
          tokens.push({type: 'text', value: char, offset: offset + i});
          i++;
        }
      } else if (char === '+') {
        // Phone Number (+1234567890)
        const phoneMatch = parsePhoneNumber(value, i);
        if (phoneMatch) {
          const {number, endIndex} = phoneMatch;
          tokens.push({type: 'phone_number', value: number, offset: offset + i});
          i = endIndex;
        } else {
          // Treat '+' as plain text
          tokens.push({type: 'text', value: char, offset: offset + i});
          i++;
        }
        // } else if (/\d/.test(char)) {
        //   // Check for bank card number
        //   const cardMatch = parseBankCard(value, i);
        //   if (cardMatch) {
        //     const { value: cardNumber, endIndex } = cardMatch;
        //     tokens.push({ type: 'bank_card', value: cardNumber });
        //     i = endIndex;
        //     continue;
        //   }
      } else {
        // Plain text
        let start = i;

        if (i < value.length && !isSpecialChar(value[i])) {
          while (i < value.length && !isSpecialChar(value[i])) {
            i++;
          }
        } else {
          i++
        }
        tokens.push({type: 'text', value: value.slice(start, i), offset: offset + i});
      }
      // if (value[i + 1] === '[') {
      //   const linkMatch = parseLinkOrCustomEmoji(value, i);
      //   if (linkMatch) {
      //     if (linkMatch.type === 'custom_emoji') {
      //       const {id, value, endIndex} = linkMatch;
      //       tokens.push({type: 'custom_emoji', id, value, offset: offset + i});
      //     }
      //     i = linkMatch.endIndex;
      //   }
      // } else {
      //
      // }
    }

    return tokens;
  }

// Existing functions omitted for brevity...
  function parseCashtag(value, startIndex) {
    let i = startIndex + 1;

    // Parse the cashtag symbol
    const symbolStart = i;
    while (i < value.length && /[A-Z0-9]/.test(value[i])) {
      i++;
    }

    if (i === symbolStart) return undefined; // No valid cashtag found
    const symbol = value.slice(symbolStart, i);

    return {symbol, endIndex: i};
  }

  function parsePhoneNumber(value, startIndex) {
    let i = startIndex + 1;

    // Parse the phone number
    const numberStart = i;
    // Allow digits, +, -, (, ), space, tab
    while (i < value.length && /[0-9+\-() \t]/.test(value[i])) {
      i++;
    }

    if (i === numberStart) return undefined; // No valid phone number found
    const number = value.slice(startIndex, i);

    return {number, endIndex: i};
  }

  function parseEmail(value, startIndex) {
    let i = startIndex;

    // Parse the local part
    const localPartStart = i;
    // Allow letters, digits, . _ % + -
    while (i < value.length && /[a-zA-Z0-9._%+-]/.test(value[i])) {
      i++;
    }

    if (i === localPartStart || value[i] !== '@') {
      return undefined; // No valid local part found
    }

    // Skip '@'
    i++; // Move past '@'

    // Parse the domain part
    const domainStart = i;
    while (i < value.length && /[a-zA-Z0-9.-]/.test(value[i])) {
      i++;
    }

    if (i === domainStart) return undefined; // No valid domain found

    const email = value.slice(startIndex, i);

    return {email, endIndex: i};
  }

  function isMentionStart(value, startIndex) {
    return value[startIndex] === '@' && /^[a-zA-Z0-9_]/.test(value[startIndex + 1]);
  }

  function parseBlockquote(value, startIndex, offset,) {
    let i = startIndex;
    const children = [];

    // Skip '>'
    i++; // Move past '>'

    // Skip optional space after '>'
    if (value[i] === ' ') {
      i++; // Move past space
    }

    // Parse blockquote content until the next non-blockquote line
    let lineStart = i;
    while (i < value.length) {
      if (value[i] === '\n' && value[i + 1] === '>') {
        // New blockquote line
        const lineContent = value.slice(lineStart, i).trim();
        if (lineContent) {
          children.push({type: 'text', value: lineContent + '\n', offset: offset + i});
        }
        i++; // Move past '\n'
        i++; // Move past '>'
        if (value[i] === ' ') {
          i++; // Move past space
        }
        lineStart = i; // Start of new line
      } else if (value[i] === '\n' || i === value.length - 1) {
        // End of blockquote
        const lineContent = value.slice(lineStart, i).trim();
        if (lineContent) {
          children.push({type: 'text', value: lineContent + '\n', offset: offset + i});
        }
        break;
      } else {
        i++;
      }
    }

    if (!children.length) return undefined; // No valid blockquote content found

    return {children, endIndex: i};
  }

  function parseLinkOrCustomEmoji(value, startIndex) {
    let i = startIndex + 1;

    // Parse the link text
    const textStart = i;
    while (i < value.length && value[i] !== ']') {
      i++;
    }
    if (i >= value.length || value[i] !== ']') return undefined;
    const text = value.slice(textStart, i);

    // Skip the ']' and check for '('
    i++; // Skip ']'
    if (i >= value.length || value[i] !== '(') return undefined;

    // Parse the URL
    i++; // Skip '('
    const urlStart = i;
    while (i < value.length && value[i] !== ')') {
      i++;
    }
    if (i >= value.length || value[i] !== ')') return undefined;
    const url = value.slice(urlStart, i);

    // Check if it's a custom emoji URL
    let match = url.match(/^tg:\/\/emoji\?id=(\d+)$/);
    if (match) {
      const emojiId = match[1];
      return { type: 'custom_emoji', id: emojiId, value: text.trim(), offset: startIndex + i, endIndex: i + 1 };
    }

    match = url.match(/^tg:\/\/user\?id=(\d+)$/);
    if (match) {
      const userId = match[1];
      return { type: 'mention_user', id: userId, value: text.trim(), offset: startIndex + i, endIndex: i + 1 };
    }

    // Otherwise, treat it as a regular link
    return { type: 'link', url, value: text, endIndex: i + 1, offset: startIndex + i };
  }

  // Parse bank card number
  function parseBankCard(value, startIndex) {
    let i = startIndex;
    let rawCardNumber = '';

    // Parse the card number (digits with optional spaces or hyphens)
    while (i < value.length && /[0-9\s/-]/.test(value[i])) {
      if (/[0-9]/.test(value[i])) {
        rawCardNumber += value[i]; // Add digit to card number
      }
      i++;
    }

    // Normalize the card number by removing spaces and hyphens
    const normalizedCardNumber = rawCardNumber.replace(/[\s\-]/g, '');

    // Validate the card number length
    if (normalizedCardNumber.length >= 12 && normalizedCardNumber.length <= 19) {
      return {value: normalizedCardNumber, endIndex: i};
    }

    return undefined; // Invalid card number
  }

  function isSpecialChar(char) {
    return ['*', '_', '`', '[', ']', '(', ')', '~', '-', '|', ':', '@', '#', '/', '$', '+', '>'].includes(char);
  }

  function isTextNode(node) {
    return node.type === 'text' || node.type === 'code' || node.type === 'pre' || node.type === 'phone_number'
      || node.type === 'cashtag' || node.type === 'command' || node.type === 'hashtag' || node.type === 'link'
      || node.type === 'mention_user';
  }

  let text = '';
  const entities: ApiMessageEntity[] = [];

  function getLength(node) {
    if (!node?.children) {
      return node?.value?.length || 0;
    }
    return node?.children?.reduce((a, b) => {
      const childLength = getLength(b) || 0;
      return a + childLength;
    }, node.value?.length || 0);
  }

  function astToApiFormatedText(nodes) {
    nodes
      .forEach(node => {
        let length1 = node.value.length;
        if (isTextNode(node) && length1 > 0) {
          switch (node.type) {
            case 'text': {
              text += node.value;
              break;
            }
            case 'mention_user': {
              text += node.value;
              entities.push({
                type: ApiMessageEntityTypes.MentionName,
                offset: Math.max(0, text.length - length1),
                length: node.value?.length || 0,
                userId: node.id
              });
              break;
            }
            case 'phone_number': {
              text += node.value;
              entities.push({
                type: ApiMessageEntityTypes.Phone,
                offset: Math.max(0, text.length - length1),
                length: length1
              });
              break;
            }
            case 'cashtag': {
              text += node.value;
              entities.push({
                type: ApiMessageEntityTypes.Cashtag,
                offset: Math.max(0, text.length - length1),
                length: length1
              });
              break;
            }
            case 'hashtag': {
              text += node.value;
              entities.push({
                type: ApiMessageEntityTypes.Hashtag,
                offset: Math.max(0, text.length - length1),
                length: length1
              });
              break;
            }
            case 'command': {
              text += node.value;
              entities.push({
                type: ApiMessageEntityTypes.BotCommand,
                offset: Math.max(0, text.length - length1),
                length: length1
              });
              break;
            }
            case 'link': {
              text += node.value;
              entities.push({
                type: ApiMessageEntityTypes.TextUrl,
                offset: Math.max(0, text.length - length1),
                length: length1,
                url: node.url
              });
              break;
            }
            case 'code': {
              text += node.value;
              entities.push({
                type: ApiMessageEntityTypes.Code,
                offset: Math.max(0, text.length - length1),
                length: length1
              })
              break;
            }
            case 'pre': {
              text += node.value.trim();
              entities.push({
                type: ApiMessageEntityTypes.Pre,
                offset: Math.max(0, text.length - length1),
                length: length1
              })
              break;
            }
          }
        }

        node.children ? astToApiFormatedText(node.children) : '';
        const length = getLength(node);
        switch (node.type) {
          case 'underline': {
            entities.push({
              type: ApiMessageEntityTypes.Underline,
              offset: Math.max(0, text.length - length),
              length
            })
            break;
          }
          case 'custom_emoji': {
            text += '🔤';
            entities.push({
              type: ApiMessageEntityTypes.CustomEmoji,
              offset: Math.max(0, text.length - length - 1),
              length,
              documentId: node.id,
            })
            break;
          }
          case 'blockquote': {
            entities.push({
              type: ApiMessageEntityTypes.Blockquote,
              offset: Math.max(0, text.length - length),
              length
            })
            break;
          }
          case 'bold': {
            entities.push({
              type: ApiMessageEntityTypes.Bold,
              offset: Math.max(0, text.length - length),
              length
            })
            break;
          }
          case 'italic': {
            entities.push({
              type: ApiMessageEntityTypes.Italic,
              offset: Math.max(0, text.length - length),
              length
            });
            break;
          }
          case 'strikethrough': {
            entities.push({
              type: ApiMessageEntityTypes.Strike,
              offset: Math.max(0, text.length - length),
              length
            });
            break;
          }
          case 'spoiler': {
            entities.push({
              type: ApiMessageEntityTypes.Spoiler,
              offset: Math.max(0, text.length - length),
              length
            });
            break;
          }
          default:
            return '';
        }
      });

    return {
      text,
      entities,
    };
  }

  function convertMarkdownIntoApiFormattedText(html) {
    // debugger;
    const value = cleanHtml(html);
    const ast = parseMarkdownAsAst(value);
    const result = astToApiFormatedText(ast);
    return result;
  }

  function astToHtmL(nodes) {
    return nodes
      .map(node => {
        if (isTextNode(node)) {
          switch (node.type) {
            case 'text':
              return node.value;
            case 'mention_user':
              return `<a href="tg://user?id=${node.id}">@${node.value}</a>`;
            case 'phone_number':
              return `<a href="tel:${node.value}">${node.value}</a>`;
            case 'cashtag':
              return `<a href="${node.value}" data-entity-type="cashtag">$${node.value}</a>`;
            case 'hashtag':
              return `<a href="${node.value}" data-entity-type="hashtag">#${node.value}</a>`;
            case 'command':
              return `<a href="${node.value}" data-entity-type="cashtag">/${node.value}</a>`;
            case 'link': {
              return `<a href="${node.url}" data-entity-type="MessageEntityUrl">${node.value}</a>`;
            }
            case 'code':
              return `<code>${node.value}</code>`;
            case 'pre': {
              const content = node.value.trim();
              return node.language
                ? `<pre data-language="${node.language}">${content}</pre>`
                : `<pre>${content}</pre>`;
            }
          }
        }

        const content = node.children ? astToHtmL(node.children) : '';
        switch (node.type) {
          case 'underline':
            return `<u>${content}</u>`;
          case 'custom_emoji':
            return `<tg-emoji emoji-id="${node.id}">${node.value}</tg-emoji>`;
          // return `<img src="https://telegram.org/img/emoji/${node.id}.png" alt="${node.description}" />`;
          case 'blockquote':
            return `<div><blockquote>${content}</blockquote></div>`;
          case 'bold':
            return `<b data-entity-type="MessageEntityBold">${content}</b>`;
          case 'italic':
            return `<i>${content}</i>`;
          case 'strikethrough':
            return `<s>${content}</s>`;
          case 'spoiler':
            return `<span class="tg-spoiler">${content}</span>`;
          default:
            // return `<br/>`
            return '';
        }
      })
      .join('');
  }

  function cleanHtml(html) {
    let parsedHtml = html.slice(0);

    // Strip redundant nbsp's
    parsedHtml = parsedHtml.replace(/&nbsp;/g, ' ');

    // Replace <div><br></div> with newline (new line in Safari)
    parsedHtml = parsedHtml.replace(/<div><br([^>]*)?><\/div>/g, '\n');
    // Replace <br> with newline
    parsedHtml = parsedHtml.replace(/<br([^>]*)?>/g, '\n');

    // Strip redundant <div> tags
    parsedHtml = parsedHtml.replace(/<\/div>(\s*)<div>/g, '\n');
    parsedHtml = parsedHtml.replace(/<div>/g, '\n');
    parsedHtml = parsedHtml.replace(/<\/div>/g, '');
    return parsedHtml;
  }

  const ast = parseMarkdownAsAst(cleanHtml(html));
  const result = astToApiFormatedText(ast);
  return result;
}
