Implemented
## Task 1
 1. add quote in base editor
 2. history of edits
 3. preview mode of markdown message (allow simple way to implement WYSIWYG). not like obsidian. Suboptimal, but fast way
 3. markdown parser based on NFA
  - nondeterministic finite automaton. parse all entities in one pass
  - support nested expression
  - support markdown v2 syntax and custom telegram entities
  - unknown syntax marked as MessageEntityUnknown


     Bold = 'MessageEntityBold'
     Blockquote = 'MessageEntityBlockquote'
     BotCommand = 'MessageEntityBotCommand',
     Cashtag = 'MessageEntityCashtag',
     Code = 'MessageEntityCode',
     Email = 'MessageEntityEmail',
     Hashtag = 'MessageEntityHashtag',
     Italic = 'MessageEntityItalic',
     MentionName = 'MessageEntityMentionName',
     Mention = 'MessageEntityMention',
     Phone = 'MessageEntityPhone',
     Pre = 'MessageEntityPre',
     Strike = 'MessageEntityStrike',
     TextUrl = 'MessageEntityTextUrl',
     Url = 'MessageEntityUrl',
     Underline = 'MessageEntityUnderline',
     Spoiler = 'MessageEntitySpoiler',
     CustomEmoji = 'MessageEntityCustomEmoji',

## Task 2. Chat Folder
 - implemented chat folder ui at desktop (support simple emoji, custom emoji and predefined icons of folder)
 - use new esg to select predefined folder icons, animated custom emoji and simple emoji
 - selected emoji/custom emoji saved before folder name
 - adjust size of chats list skeleton on desktop

## Task 3. ESG
### implemented 3 tabs:
 1. emoji. merge simple emoji and custom emoji into one tab.
   - text search allow search by keywords of customEmoji (like on webK) and by emoji.
   Used fuzzy search for check matched keywords
   - search by emoji group
   - navigate by emoji category in emoji feed
   - can open emoji search at fullscreen (mobile) and at right column (desktop)
 2. stickers.
   - ai powered sticker search in text field
   - search by emoji group
   - add premium sticker label in search result
   - emoji group use animated custom emoji
 3. gifs
   - search gifs by text
   - search by emoji group (like on webK)
   - on a mobile phone, close the full-screen search mode after selecting a gif (the behavior is similar on iOS)

## Bonus task. Animated chat background
 - animate chat background if enabled
 - pattern fetch for api server
 - animate bg after send message, gif, sticker, edit message, attach images and all other action which send message into chat
