export const randomSelectByScore = (word, score, lastTestDate, frequency) => {
  const daysSince = Math.floor((Date.now() - new Date(lastTestDate)) / (1000 * 60 * 60 * 24));
  const offset = (frequency % 1000.0) / 1000.0; // Refinement offset to favor lower frequency.
  const base = (2 ** score) + offset;
  const exponent = daysSince - base;
  const c = 1.17; // curvature controls the number of candidate days around the base
  const y = 0.5 * (c**exponent); // 50% probability at base days
  const r = Math.random();
  if(score <= 4){
    // console.log("word="+word+", score="+score+", daysSince="+daysSince+", exponent="+exponent+", r="+r+", y="+y);
  }
  return r <= y;
}

export const getTodaysDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so we add 1
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    // const todayStr = `${year}-${month}-01`;
    return todayStr;
}