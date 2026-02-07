let cachedRealUserId = null;
let cachedEffectiveUserId = null;

/* REAL USER (AUTH) */
export const setRealUserId = (userId) => {
  cachedRealUserId = userId;
};

export const getUserId = () => {
  return cachedRealUserId;
};

/* EFFECTIVE USER (DATA SCOPE) */
export const setEffectiveUserId = (userId) => {
  cachedEffectiveUserId = userId;
};

export const getEffectiveUserId = () => {
  return cachedEffectiveUserId ?? getUserId();
};

/* AUTH */
export const isAuthorized = () => true;
