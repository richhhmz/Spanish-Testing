// frontend/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  /* ---------------------------------------------------------
     If already authorized, redirect to home.
     If not authorized, show login page.
     --------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');

      if (!token) {
        if (!cancelled) setCheckingAuth(false);
        return;
      }

      try {
        const res = await axios.get('/auth/effective-user');
        if (cancelled) return;

        if (res.status === 200) {
          navigate('/spanish/home', { replace: true });
          return;
        }

        setCheckingAuth(false);
      } catch (err) {
        if (cancelled) return;
        setCheckingAuth(false);
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  /* ---------------------------------------------------------
     Snackbar reasons (session expired, etc.)
     --------------------------------------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');

    if (reason === 'session-expired') {
      enqueueSnackbar(
        'Your session expired due to inactivity. Please sign in again.',
        { variant: 'info' }
      );
    } else if (reason === 'auth-failed') {
      enqueueSnackbar('Please sign in to continue.', { variant: 'warning' });
    }

    if (reason) {
      window.history.replaceState({}, '', '/login');
    }
  }, [enqueueSnackbar]);

  /* ---------------------------------------------------------
     Submit handler
     --------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();

    if (!trimmed) {
      setError('Email address is required');
      return;
    }

    try {
      setLoading(true);

      // email is your userId
      const res = await axios.post('/auth/login', {
        userId: trimmed,
      });

      const { token } = res.data;
      localStorage.setItem('authToken', token);

      navigate('/spanish/home', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     Loading state while checking auth
     --------------------------------------------------------- */
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-600">
        Loading…
      </div>
    );
  }

  /* ---------------------------------------------------------
     Render page
     --------------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-xl">
        {/* Public product info */}
        <div className="mb-4 bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            Progressive Spanish Learning
          </h1>

          <p className="mt-3 text-gray-700 leading-relaxed">
            This application teaches Spanish vocabulary using a progressive learning
            system which allows the user to focus more on what they are learning and
            to waste less time on the words they know well. It gives the user complete
            control of their personal learning routine.
          </p>

          <div className="mt-4 text-gray-800">
            <div className="font-semibold">Price: $5.00/month</div>

            <div className="mt-1 text-sm text-gray-700">Cancel anytime.</div>

            <div className="mt-3 text-sm text-gray-700">
              <a
                href="https://progspanlrn.com/support"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Click here for customer support
              </a>
              .
            </div>
          </div>
        </div>

        Login form
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full border px-3 py-2 rounded mb-4"
            autoFocus
          />

          {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
