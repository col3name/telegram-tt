//
// function parseAsAst(value) {
//   const tokens = [];
//   let i = 0;
//
//   while (i < value.length) {
//     const char = value[i];
//
//     if (char === "*") {
//       // Check for bold or italic
//       if (value[i + 1] === "*") {
//         // Bold (**text**)
//         const [content, endIndex] = parseEnclosedContent(value, i, "**", "**");
//         tokens.push({ type: "bold", children: parseAsAst(content) });
//         i = endIndex;
//       } else {
//         // Italic (*text*)
//         const [content, endIndex] = parseEnclosedContent(value, i, "*", "*");
//         tokens.push({ type: "italic", children: parseAsAst(content) });
//         i = endIndex;
//       }
//     } else if (char === "_") {
//       // Italic (_text_)
//       const [content, endIndex] = parseEnclosedContent(value, i, "_", "_");
//       tokens.push({ type: "italic", children: parseAsAst(content) });
//       i = endIndex;
//     } else if (char === "`") {
//       if (value[i + 1] === "`" && value[i + 2] === "`") {
//         // Preformatted code block (```)
//         const [content, endIndex] = parseEnclosedContent(value, i, "```", "```");
//         tokens.push({ type: "pre", value: content });
//         i = endIndex;
//       } else {
//         // Inline code (`code`)
//         const [content, endIndex] = parseEnclosedContent(value, i, "`", "`");
//         tokens.push({ type: "code", value: content });
//         i = endIndex;
//       }
//     } else if (char === "[") {
//       // Link ([text](url))
//       const linkMatch = parseLink(value, i);
//       if (linkMatch) {
//         const { text, url, endIndex } = linkMatch;
//         tokens.push({ type: "link", text: parseAsAst(text), url });
//         i = endIndex;
//       } else {
//         // Treat '[' as plain text
//         tokens.push({ type: "text", value: char });
//         i++;
//       }
//     } else if (char === "~" && value[i + 1] === "~") {
//       // Strikethrough (~~text~~)
//       const [content, endIndex] = parseEnclosedContent(value, i, "~~", "~~");
//       tokens.push({ type: "strikethrough", children: parseAsAst(content) });
//       i = endIndex;
//     } else if (char === "-" && value[i + 1] === "-") {
//       // Underline (--text--)
//       const [content, endIndex] = parseEnclosedContent(value, i, "--", "--");
//       tokens.push({ type: "underline", children: parseAsAst(content) });
//       i = endIndex;
//     } else if (char === "|" && value[i + 1] === "|") {
//       // Spoiler (||text||)
//       const [content, endIndex] = parseEnclosedContent(value, i, "||", "||");
//       tokens.push({ type: "spoiler", children: parseAsAst(content) });
//       i = endIndex;
//     } else if (char === ":") {
//       // Custom emoji (:[emoji_shortname]:)
//       const emojiMatch = parseEmoji(value, i);
//       if (emojiMatch) {
//         const { shortname, endIndex } = emojiMatch;
//         tokens.push({ type: "emoji", shortname });
//         i = endIndex;
//       } else {
//         // Treat ':' as plain text
//         tokens.push({ type: "text", value: char });
//         i++;
//       }
//     } else if (char === "@") {
//       // Mention (@username)
//       const mentionMatch = parseMention(value, i);
//       if (mentionMatch) {
//         const { username, endIndex } = mentionMatch;
//         tokens.push({ type: "mention", value: username });
//         i = endIndex;
//       } else {
//         // Treat '@' as plain text
//         tokens.push({ type: "text", value: char });
//         i++;
//       }
//     } else if (char === "#") {
//       // Hashtag (#hashtag)
//       const hashtagMatch = parseHashtag(value, i);
//       if (hashtagMatch) {
//         const { tag, endIndex } = hashtagMatch;
//         tokens.push({ type: "hashtag", value: tag });
//         i = endIndex;
//       } else {
//         // Treat '#' as plain text
//         tokens.push({ type: "text", value: char });
//         i++;
//       }
//     } else if (char === "/") {
//       // Command (/command or /command@botname)
//       const commandMatch = parseCommand(value, i);
//       if (commandMatch) {
//         const { command, bot, endIndex } = commandMatch;
//         tokens.push({ type: "command", value: command, bot });
//         i = endIndex;
//       } else {
//         // Treat '/' as plain text
//         tokens.push({ type: "text", value: char });
//         i++;
//       }
//     } else {
//       // Plain text
//       let start = i;
//       while (i < value.length && !isSpecialChar(value[i])) {
//         i++;
//       }
//       tokens.push({ type: "text", value: value.slice(start, i) });
//     }
//   }
//
//   return tokens;
// }
//
function parseEnclosedContent(value, startIndex, startDelimiter, endDelimiter) {
  const delimiterLength = startDelimiter.length;
  let i = startIndex + delimiterLength;

  // Find the matching closing delimiter
  while (i <= value.length - delimiterLength) {
    if (value.slice(i, i + delimiterLength) === endDelimiter) {
      return [value.slice(startIndex + delimiterLength, i), i + delimiterLength];
    }
    i++;
  }

  // If no closing delimiter is found, treat the rest as plain text
  return [value.slice(startIndex + delimiterLength), value.length];
}

function parseLink(value, startIndex) {
  let i = startIndex + 1;

  // Parse the link text
  const textStart = i;
  while (i < value.length && value[i] !== "]") {
    i++;
  }
  if (i >= value.length || value[i] !== "]") return null;
  const text = value.slice(textStart, i);

  // Skip the ']' and check for '('
  i++; // Skip ']'
  if (i >= value.length || value[i] !== "(") return null;

  // Parse the URL
  i++; // Skip '('
  const urlStart = i;
  while (i < value.length && value[i] !== ")") {
    i++;
  }
  if (i >= value.length || value[i] !== ")") return null;
  const url = value.slice(urlStart, i);

  return { text, url, endIndex: i + 1 }; // Include ')'
}

function parseEmoji(value, startIndex) {
  let i = startIndex + 1;

  // Parse the emoji shortname
  const shortnameStart = i;
  while (i < value.length && value[i] !== ":" && /[a-zA-Z0-9_]/.test(value[i])) {
    i++;
  }

  if (i >= value.length || value[i] !== ":") return null; // No closing ':'
  const shortname = value.slice(shortnameStart, i);

  return { shortname, endIndex: i + 1 }; // Include the closing ':'
}

function parseMention(value, startIndex) {
  let i = startIndex + 1;

  // Parse the username
  const usernameStart = i;
  while (i < value.length && /[a-zA-Z0-9_]/.test(value[i])) {
    i++;
  }

  if (i === usernameStart) return null; // No valid username found
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

  if (i === tagStart) return null; // No valid hashtag found
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

  if (i === commandStart) return null; // No valid command found
  const command = value.slice(commandStart, i);

  // Check for optional bot name
  let bot = null;
  if (value[i] === "@" && i + 1 < value.length) {
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

// function isSpecialChar(char) {
//   return ["*", "_", "`", "[", "]", "(", ")", "~", "-", "|", ":", "@", "#", "/"].includes(char);
// }
function parseAsAst(value) {
  const tokens = [];
  let i = 0;

  while (i < value.length) {
    const char = value[i];

    if (char === "*") {
      // Check for bold or italic
      if (value[i + 1] === "*") {
        // Bold (**text**)
        const [content, endIndex] = parseEnclosedContent(value, i, "**", "**");
        tokens.push({ type: "bold", children: parseAsAst(content) });
        i = endIndex;
      } else {
        // Italic (*text*)
        const [content, endIndex] = parseEnclosedContent(value, i, "*", "*");
        tokens.push({ type: "italic", children: parseAsAst(content) });
        i = endIndex;
      }
    } else if (char === "_") {
      // Italic (_text_)
      const [content, endIndex] = parseEnclosedContent(value, i, "_", "_");
      tokens.push({ type: "italic", children: parseAsAst(content) });
      i = endIndex;
    } else if (char === "`") {
      if (value[i + 1] === "`" && value[i + 2] === "`") {
        // Preformatted code block (```)
        const [content, endIndex] = parseEnclosedContent(value, i, "```", "```");
        tokens.push({ type: "pre", value: content });
        i = endIndex;
      } else {
        // Inline code (`code`)
        const [content, endIndex] = parseEnclosedContent(value, i, "`", "`");
        tokens.push({ type: "code", value: content });
        i = endIndex;
      }
    } else if (char === "[") {
      // Link ([text](url)) or Custom Emoji
      const linkMatch = parseLinkOrCustomEmoji(value, i);
      if (linkMatch) {
        if (linkMatch.type === "link") {
          const { text, url, endIndex } = linkMatch;
          tokens.push({ type: "link", text: parseAsAst(text), url });
        } else if (linkMatch.type === "custom_emoji") {
          const { id, description, endIndex } = linkMatch;
          tokens.push({ type: "custom_emoji", id, description });
        }
        i = linkMatch.endIndex;
      } else {
        // Treat '[' as plain text
        tokens.push({ type: "text", value: char });
        i++;
      }
    } else if (char === "~" && value[i + 1] === "~") {
      // Strikethrough (~~text~~)
      const [content, endIndex] = parseEnclosedContent(value, i, "~~", "~~");
      tokens.push({ type: "strikethrough", children: parseAsAst(content) });
      i = endIndex;
    } else if (char === "-" && value[i + 1] === "-") {
      // Underline (--text--)
      const [content, endIndex] = parseEnclosedContent(value, i, "--", "--");
      tokens.push({ type: "underline", children: parseAsAst(content) });
      i = endIndex;
    } else if (char === "|" && value[i + 1] === "|") {
      // Spoiler (||text||)
      const [content, endIndex] = parseEnclosedContent(value, i, "||", "||");
      tokens.push({ type: "spoiler", children: parseAsAst(content) });
      i = endIndex;
    } else if (char === ":") {
      // Custom emoji (:[emoji_shortname]:)
      const emojiMatch = parseEmoji(value, i);
      if (emojiMatch) {
        const { shortname, endIndex } = emojiMatch;
        tokens.push({ type: "emoji", shortname });
        i = endIndex;
      } else {
        // Treat ':' as plain text
        tokens.push({ type: "text", value: char });
        i++;
      }
    } else if (char === ">") {
      // Blockquote (> text)
      const blockquoteMatch = parseBlockquote(value, i);
      if (blockquoteMatch) {
        const { childrenItems, endIndex } = blockquoteMatch;
        tokens.push({ type: "blockquote", childrenItems });
        i = endIndex;
      } else {
        // Treat '>' as plain text
        tokens.push({ type: "text", value: char });
        i++;
      }
    } else if (char === "@") {
      // Mention (@username) or Email Address
      if (isMentionStart(value, i)) {
        const mentionMatch = parseMention(value, i);
        if (mentionMatch) {
          const { username, endIndex } = mentionMatch;
          tokens.push({ type: "mention", value: username });
          i = endIndex;
        } else {
          // Treat '@' as plain text
          tokens.push({ type: "text", value: char });
          i++;
        }
      } else {
        const emailMatch = parseEmail(value, i);
        if (emailMatch) {
          const { email, endIndex } = emailMatch;
          tokens.push({ type: "email", value: email });
          i = endIndex;
        } else {
          // Treat '@' as plain text
          tokens.push({ type: "text", value: char });
          i++;
        }
      }
    } else if (char === "#") {
      // Hashtag (#hashtag)
      const hashtagMatch = parseHashtag(value, i);
      if (hashtagMatch) {
        const { tag, endIndex } = hashtagMatch;
        tokens.push({ type: "hashtag", value: tag });
        i = endIndex;
      } else {
        // Treat '#' as plain text
        tokens.push({ type: "text", value: char });
        i++;
      }
    } else if (char === "/") {
      // Command (/command or /command@botname)
      const commandMatch = parseCommand(value, i);
      if (commandMatch) {
        const { command, bot, endIndex } = commandMatch;
        tokens.push({ type: "command", value: command, bot });
        i = endIndex;
      } else {
        // Treat '/' as plain text
        tokens.push({ type: "text", value: char });
        i++;
      }
    } else if (char === "$") {
      // Cashtag ($AAPL)
      const cashtagMatch = parseCashtag(value, i);
      if (cashtagMatch) {
        const { symbol, endIndex } = cashtagMatch;
        tokens.push({ type: "cashtag", value: symbol });
        i = endIndex;
      } else {
        // Treat '$' as plain text
        tokens.push({ type: "text", value: char });
        i++;
      }
    } else if (char === "+") {
      // Phone Number (+1234567890)
      const phoneMatch = parsePhoneNumber(value, i);
      if (phoneMatch) {
        const { number, endIndex } = phoneMatch;
        tokens.push({ type: "phone_number", value: number });
        i = endIndex;
      } else {
        // Treat '+' as plain text
        tokens.push({ type: "text", value: char });
        i++;
      }
    } else {
      // Plain text
      let start = i;
      while (i < value.length && !isSpecialChar(value[i])) {
        i++;
      }
      tokens.push({ type: "text", value: value.slice(start, i) });
    }
  }

  return tokens;
}

// Existing functions omitted for brevity...

function parseEmail(value, startIndex) {
  let i = startIndex;

  // Parse the local part
  const localPartStart = i;
  while (
    i < value.length &&
    /[a-zA-Z0-9._%+-]/.test(value[i]) // Allow letters, digits, . _ % + -
    ) {
    i++;
  }

  if (i === localPartStart || value[i] !== "@") return null; // No valid local part found

  // Skip '@'
  i++; // Move past '@'

  // Parse the domain part
  const domainStart = i;
  while (i < value.length && /[a-zA-Z0-9.-]/.test(value[i])) {
    i++;
  }

  if (i === domainStart) return null; // No valid domain found

  const email = value.slice(startIndex, i);

  return { email, endIndex: i };
}

// Existing functions omitted for brevity...

function parseCashtag(value, startIndex) {
  let i = startIndex + 1;

  // Parse the cashtag symbol
  const symbolStart = i;
  while (i < value.length && /[A-Z0-9]/.test(value[i])) {
    i++;
  }

  if (i === symbolStart) return null; // No valid cashtag found
  const symbol = value.slice(symbolStart, i);

  return { symbol, endIndex: i };
}

function parsePhoneNumber(value, startIndex) {
  let i = startIndex + 1;

  // Parse the phone number
  const numberStart = i;
  while (
    i < value.length &&
    /[0-9+\-() \t]/.test(value[i]) // Allow digits, +, -, (, ), space, tab
    ) {
    i++;
  }

  if (i === numberStart) return null; // No valid phone number found
  const number = value.slice(startIndex, i);

  return { number, endIndex: i };
}


function parseEmail(value, startIndex) {
  let i = startIndex;

  // Parse the local part
  const localPartStart = i;
  while (
    i < value.length &&
    /[a-zA-Z0-9._%+-]/.test(value[i]) // Allow letters, digits, . _ % + -
    ) {
    i++;
  }

  if (i === localPartStart || value[i] !== "@") return null; // No valid local part found

  // Skip '@'
  i++; // Move past '@'

  // Parse the domain part
  const domainStart = i;
  while (i < value.length && /[a-zA-Z0-9.-]/.test(value[i])) {
    i++;
  }

  if (i === domainStart || !value.slice(domainStart).includes(".")) return null; // No valid domain found

  const email = value.slice(startIndex, i);

  return { email, endIndex: i };
}

function isMentionStart(value, startIndex) {
  return value[startIndex] === "@" && /^[a-zA-Z0-9_]/.test(value[startIndex + 1]);
}

function parseBlockquote(value, startIndex) {
  let i = startIndex;
  const childrenItems = [];

  // Skip '>'
  i++; // Move past '>'

  // Skip optional space after '>'
  if (value[i] === " ") {
    i++; // Move past space
  }

  // Parse blockquote content until the next non-blockquote line
  let lineStart = i;
  while (i < value.length) {
    if (value[i] === "\n" && value[i + 1] === ">") {
      // New blockquote line
      const lineContent = value.slice(lineStart, i).trim();
      if (lineContent) {
        childrenItems.push({ type: "text", value: lineContent });
      }
      i++; // Move past '\n'
      i++; // Move past '>'
      if (value[i] === " ") {
        i++; // Move past space
      }
      lineStart = i; // Start of new line
    } else if (value[i] === "\n" || i === value.length - 1) {
      // End of blockquote
      const lineContent = value.slice(lineStart, i).trim();
      if (lineContent) {
        childrenItems.push({ type: "text", value: lineContent });
      }
      break;
    } else {
      i++;
    }
  }

  if (!childrenItems.length) return null; // No valid blockquote content found

  return { childrenItems, endIndex: i };
}

function parseLinkOrCustomEmoji(value, startIndex) {
  let i = startIndex + 1;

  // Parse the link text
  const textStart = i;
  while (i < value.length && value[i] !== "]") {
    i++;
  }
  if (i >= value.length || value[i] !== "]") return null;
  const text = value.slice(textStart, i);

  // Skip the ']' and check for '('
  i++; // Skip ']'
  if (i >= value.length || value[i] !== "(") return null;

  // Parse the URL
  i++; // Skip '('
  const urlStart = i;
  while (i < value.length && value[i] !== ")") {
    i++;
  }
  if (i >= value.length || value[i] !== ")") return null;
  const url = value.slice(urlStart, i);

  // Check if it's a custom emoji URL
  const match = url.match(/^tg:\/\/emoji\?id=(\d+)$/);
  if (match) {
    const emojiId = match[1];
    return { type: "custom_emoji", id: emojiId, description: text.trim(), endIndex: i + 1 };
  }

  // Otherwise, treat it as a regular link
  return { type: "link", text, url, endIndex: i + 1 };
}


function isSpecialChar(char) {
  return ["*", "_", "`", "[", "]", "(", ")", "~", "-", "|", ":", "@", "#", "/", "$", "+", ">"].includes(char);
}
const input = `
 This is exampe text **Hello** @user #tag /start@bot  sdfd _world_
 +1-212-555-0123
 $AAPL

>Block quotation single line \n
Delimitier \n
>Block quotation started
>Block quotation second
>Block quotation third
>Block quotation end
Check this out: ![👍](tg://emoji?id=5368324170671202286) and ![😎](tg://emoji?id=5468508491168411106)
**Bold _child_**
user@example.com
  ~~striked~~ __underlined__ \`console.log('hello world')\` ||spoiler|| Lorem ipsum :smile: [Click here](https://example.com)
  \`\`\`
  for (let i = 0; i < 10; i++) {
    console.log(i * i);
  }
  \`\`\`
 `;
const ast = parseAsAst(input);
console.log(JSON.stringify(ast, null, 2));
