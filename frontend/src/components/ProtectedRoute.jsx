import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/AxiosClient';

const ProtectedRoute = () => {
  const [status, setStatus] = useState('checking'); // checking | authed | unauthed
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // ✅ authoritative cookie-based check
        await axios.get('/auth/effective-user');
        if (cancelled) return;
        setStatus('authed');
      } catch (err) {
        if (cancelled) return;

        // Important: avoid infinite loops
        const reason =
          err.response?.status === 401 ? 'session-expired' : 'auth-failed';

        setStatus('unauthed');
        navigate(`/login?reason=${reason}`, {
          replace: true,
          state: { from: location.pathname },
        });
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  if (status === 'checking') {
    return <div className="p-8 text-center text-gray-600">Loading…</div>;
  }

  if (status === 'authed') {
    return <Outlet />;
  }

  // We already navigated away. Render nothing.
  return null;
};

export default ProtectedRoute;
