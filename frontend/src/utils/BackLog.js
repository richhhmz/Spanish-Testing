import axios from '../api/AxiosClient.js';

export const BackLog = async (message, context = '') => {
  try {
    if (window.location.pathname === '/magic') return;
    await axios.post('/backlog', {
      message,
      context,
    });
  } catch (err) {
    // Fallback so you never lose the message entirely
    console.error('BackLog failed:', err, message);
  }
};
