export const fuzzySearch = (text: string, query: string): boolean => {
  if (!text || !query) {
    return false;
  }
  let i = -1;
  let q = -1;
  let w = 0;
  let cw = 0;

  if (text === query || text === `${query}:`) {
    return true;
  }

  while (q < query.length - 1 && i < text.length - 1) {
    if (text.charAt(i + 1) === query.charAt(q + 1)) {
      q++;
      cw += 1;
    } else {
      cw -= 1;
    }

    w += cw;
    i++;
  }

  return q === query.length - 1;
};
