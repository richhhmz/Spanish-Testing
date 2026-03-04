import axios from '../api/AxiosClient.js';
import { isDebug } from '../globals.js';
import { BackLog } from './BackLog.js';
var isANewDay = false;

export const newDay = async (enqueueSnackbar) => {
  try {
    if(isDebug)BackLog("[newDay] is checking if day changed");
    const response = await axios.get('/api/spanish/getProfile');
    const profile = response.data?.data;
    if (!profile || !profile.lastVisitDate) {
      if(isDebug)BackLog("[newDay] missing profile or profile.lastVisitDate");
      return;
    }
    const today = getTodaysDate();
    if(isDebug)BackLog(`[newDay] profile.lastVisitDate=${profile.lastVisitDate}, today=${today}`);

    if (profile.lastVisitDate !== today) {
      if(isDebug)BackLog("[newDay] The day since the last visit has changed. Calling /ping");
      try {
        // 🔔 Trigger backend daily ping (safe if multiple users call it)
        if(isDebug)BackLog("[newDay] before ping");
        await axios.get('/ping');
        if(isDebug)BackLog("[newDay] after ping");
      } catch (err) {
        console.error('[newDay] /ping failed:', err);
      }
    }

    if (profile.lastVisitDate !== today) {
      if(isDebug)BackLog("[newDay] The test day has changed. Going home");
      if(isDebug)BackLog(`[newDay] lastVisitDate=${profile.lastVisitDate}, today=${today}`);

      enqueueSnackbar(
        'Resetting for a new day',
        { variant: 'info', autoHideDuration: 5000 }
      );

      setTimeout(() => {
        window.location.href = '/';
      }, 5000);

      isANewDay = true;
    }

    return isANewDay;
  } catch (error) {
    console.error('newDay failed:', error);
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
    return '/';
  }
};

export const getTodaysDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so we add 1
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return todayStr;
};

export const getTodaysTime = () => {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

export const getTodaysDateUTC = () => {
    const today = new Date();

    const year  = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(today.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export const getTodaysTimeUTC = () => {
    const now = new Date();

    const hours   = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
};

export const getTimeNow = () => {
    const now = new Date();

    const hours   = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
};