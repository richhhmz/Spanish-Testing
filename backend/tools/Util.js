export const randomSelectByScore = (word, score, lastTestDate, frequency) => {
  const daysSince = Math.floor((Date.now() - new Date(lastTestDate)) / (1000 * 60 * 60 * 24));
  const offset = (frequency % 1000.0) / 1000.0; // Refinement offset to favor lower frequency.
  const base = (2 ** score) + offset;
  const exponent = daysSince - base;
  const c = 1.17; // curvature controls the number of candidate days around the base
  const y = 0.5 * (c**exponent); // 50% probability at base days
  const r = Math.random();
  return r <= y;
}

export const getTodaysDateUTC = () => {
    const today = new Date();

    const year  = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(today.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export const getTodaysTimeUTC = () => {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};
