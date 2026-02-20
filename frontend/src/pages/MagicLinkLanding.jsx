import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { BackLog } from '../utils/BackLog';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function MagicLinkLanding() {
  const [status, setStatus] = useState('Redeeming your link...');
  const [working, setWorking] = useState(true);

  const query = useQuery();
  const token = query.get('token');

  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  BackLog(`@[MagicLinkLanding] start`);

  useEffect(() => {
    let cancelled = false;

    async function redeem() {
      if (!token) {
        setWorking(false);
        setStatus('Missing token in URL.');
        return;
      }

      try {
        setWorking(true);
        setStatus('Redeeming your link...');

        // IMPORTANT: cookies are set by server; AxiosClient should have withCredentials:true
        await axios.post('/magic/redeem', { token });

        if (cancelled) return;

        enqueueSnackbar('Signed in!', { variant: 'success' });
        navigate('/', { replace: true });
      } catch (err) {
        console.error('magic redeem failed:', err);

        if (cancelled) return;

        const msg =
          err?.response?.data?.error ||
          'That link is invalid or expired. Please request a new one.';

        enqueueSnackbar(msg, { variant: 'error' });
        setStatus(msg);
      } finally {
        if (!cancelled) setWorking(false);
      }
    }

    redeem();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, enqueueSnackbar]);

  return (
    <div>
      <div className="ml-[0.25in] mt-8 max-w-lg">
        <h2 className="text-2xl font-semibold">Signing you in…</h2>
        <p className="mt-2">{status}</p>

        {!working && (
          <button
            className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}
