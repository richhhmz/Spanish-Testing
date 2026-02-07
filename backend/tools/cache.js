// cache.js
let cache = {
  words: null,
};

export const setWords = (words) => {
  cache.words = words;
};

export const getWords = () => {
  return cache.words;
};

export const resetCache = () => {
  cache.words = null;
};

