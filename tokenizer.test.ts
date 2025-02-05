import { tokenize } from './tokenizer';

describe('markdown tokenizer', () => {
  it('should tokenize plain text', () => {
    const input = 'Hello world';
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      { type: 'text', value: 'Hello world', offset: 0 }
    ]);
  });

  it('should tokenize bold text', () => {
    const input = 'Hello **world**';
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      { type: 'text', value: 'Hello ', offset: 0 },
      { type: 'bold_start', value: '**', offset: 6 },
      { type: 'text', value: 'world', offset: 8 },
      { type: 'bold_end', value: '**', offset: 13 }
    ]);
  });

  it('should tokenize italic text', () => {
    const input = 'Hello __world__';
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      { type: 'text', value: 'Hello ', offset: 0 },
      { type: 'italic_start', value: '__', offset: 6 },
      { type: 'text', value: 'world', offset: 8 },
      { type: 'italic_end', value: '__', offset: 13 }
    ]);
  });

  it('should tokenize code', () => {
    const input = 'Hello `code`';
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      { type: 'text', value: 'Hello ', offset: 0 },
      { type: 'code_start', value: '`', offset: 6 },
      { type: 'text', value: 'code', offset: 7 },
      { type: 'code_end', value: '`', offset: 11 }
    ]);
  });

  it('should tokenize mixed formatting', () => {
    const input = '**bold** and __italic__';
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      { type: 'bold_start', value: '**', offset: 0 },
      { type: 'text', value: 'bold', offset: 2 },
      { type: 'bold_end', value: '**', offset: 6 },
      { type: 'text', value: ' and ', offset: 8 },
      { type: 'italic_start', value: '__', offset: 13 },
      { type: 'text', value: 'italic', offset: 15 },
      { type: 'italic_end', value: '__', offset: 21 }
    ]);
  });

  it('should handle empty string', () => {
    const input = '';
    const tokens = tokenize(input);
    expect(tokens).toEqual([]);
  });

  it('should handle only tokens without content', () => {
    const input = '****';
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      { type: 'bold_start', value: '**', offset: 0 },
      { type: 'bold_end', value: '**', offset: 2 }
    ]);
  });
});
