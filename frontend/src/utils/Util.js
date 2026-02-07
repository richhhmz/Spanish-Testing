import axios from '../api/AxiosClient.js';
import { isDebug } from '../globals.js';
import { BackLog } from './BackLog.js';
var newDay = false;

export const homeIfNotToday = async (enqueueSnackbar) => {
  try {
    if(isDebug)BackLog("homeIfNotToday is checking if day changed");
    const response = await axios.get('/api/spanish/getProfile');
    const profile = response.data?.data;
    if (!profile || !profile.lastVisitDate) {
      if (isDebug) BackLog("homeIfNotToday missing profile or profile.lastVisitDate");
      return;
    }
    const today = getTodaysDate();
    if (isDebug) { BackLog(`profile.lastVisitDate=${profile.lastVisitDate}, today=${today}`) };
    if (profile.lastVisitDate !== today) {
      if (isDebug) BackLog("The day has changed. Going home");
      enqueueSnackbar(
        'Resetting for a new day',
        { variant: 'info', autoHideDuration: 5000, }
      );
      setTimeout(() => {
        window.location.href = '/spanish/home';
      }, 5000);
      newDay = true;
    }
    return newDay;
  } catch (error) {
    console.error('homeIfNotToday failed:', error);
    // fail silently — do not block navigation
  }
};

export const getUrlForCode = (code) => {
  if (code === 'ast') {
    return '/spanish/allSpanishTests';
  }
  else if (code === 'tst') {
    return '/spanish/todaysSpanishTests';
  }
  if (code === 'qwl') {
    return '/spanish/quickWordLookup';
  }
  if (code === 'ts') {
    return '/spanish/translationSearch';
  }
  else {
    return '/spanish/home';
  }
};

export const getTodaysDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so we add 1
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  // const todayStr = `${year}-${month}-01`;
  return todayStr;
};
