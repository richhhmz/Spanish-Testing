import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { isDebug } from '../globals.js';
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

  useEffect(() => {
    let cancelled = false;

    async function redeem() {
      if(isDebug)BackLog(`[MagicLinkLanding] redeem() begin`);
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

        // 🔍 NEW: Immediately test /auth/effective-user to see if cookies are working
        try {
          const res = await axios.get('/auth/effective-user'); // NEW
          if (isDebug) { // NEW
            BackLog(
              `[MagicLinkLanding] /auth/effective-user after redeem OK: ` +
              JSON.stringify(res.data)
            );
          }
        } catch (err2) {
          if (isDebug) { // NEW
            BackLog(
              `[MagicLinkLanding] /auth/effective-user after redeem FAILED: ` +
              `${err2?.response?.status} ` +
              JSON.stringify(err2?.response?.data || {})
            );
          }
        }

        // enqueueSnackbar('Signed in!', { variant: 'success' }); Was happening even if auth-failed
        if (isDebug)BackLog(`[MagicLinkLanding] redeem() end`);

        // ⏱️ NEW: tiny delay to ensure cookies are fully committed
        setTimeout(() => {
          if (!cancelled) {
            navigate('/', { replace: true });
          }
        }, 300); // NEW
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
