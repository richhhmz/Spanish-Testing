import axios from '../api/AxiosClient';

export const BackLog = async (message, context = '') => {
  try {
    await axios.post('/backlog', {
      message,
      context,
    });
  } catch (err) {
    // Fallback so you never lose the message entirely
    console.error('BackLog failed:', err, message);
  }
};
