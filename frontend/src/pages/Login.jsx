import React, { useState, useEffect } from 'react';
import axios from '../api/AxiosClient';
import { isDebug } from '../globals.js';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');

    if (reason === 'session-expired') {
      enqueueSnackbar(
        'Your session expired due to inactivity. Please sign in again.',
        { variant: 'info' }
      );
    } else if (reason === 'auth-failed') {
      enqueueSnackbar(
        'Please sign in to continue.',
        { variant: 'warning' }
      );
    }

    // 🔧 Prevent repeat snackbar on re-render or refresh
    if (reason) {
      window.history.replaceState({}, '', '/login');
    }
  }, [enqueueSnackbar]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim()) {
      setError('User ID is required');
      return;
    }

    try {
      setLoading(true);

      // 🔐 Login → get JWT
      const res = await axios.post('/auth/login', {
        userId: userId.trim(),
      });

      const { token } = res.data;

      // 💾 Store token
      localStorage.setItem('authToken', token);

      // 🚀 Go to home
      navigate('/spanish/home', { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow w-96"
      >
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Login
        </h2>

        <label className="block mb-2 font-semibold">
          User ID
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
          autoFocus
        />

        {error && (
          <div className="mb-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
