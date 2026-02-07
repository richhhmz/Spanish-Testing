import { useEffect, useState } from 'react';
import axios from '../api/AxiosClient';

export const Ping = () => {
  const [response, setResponse] = useState(null);

  useEffect(() => {
    const ping = async () => {
      try {
        const response = await axios.get('/ping');
        setResponse(response.data.data);
      } catch (error) {
        console.error('Ping error:', error);
      }
    };

    ping();
  }, []); // Empty dependency array => runs once when the component mounts

  return (
    <div>
        <p>{response}</p>
    </div>
  );
};

export default Ping;
