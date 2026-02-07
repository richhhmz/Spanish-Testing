import { useEffect, useState } from 'react';
import axios from '../api/AxiosClient';

export const ResetCache = () => {
  const [response, setResponse] = useState(null);

  useEffect(() => {
    const resetCache = async () => {
      try {
        const response = await axios.get('/resetCache');
        setResponse(response.data.data);
      } catch (error) {
        console.error('Error resetting cache:', error);
      }
    };

    resetCache();
  }, []); // Empty dependency array => runs once when the component mounts

  return (
    <div>
        <p>{response}</p>
    </div>
  );
};

export default ResetCache;
