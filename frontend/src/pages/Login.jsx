import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { DefaultHeader } from './DefaultHeader.jsx';
import { DefaultFooter } from './DefaultFooter.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const requestLink = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      enqueueSnackbar('Please enter your email.', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);

      await axios.post('/magic/request', { email });

      // Important: Always show neutral message
      enqueueSnackbar(
        'If that email exists, a login link has been sent.',
        { variant: 'info' }
      );

      navigate('/waiting-for-email');
    } catch (err) {
      console.error('Magic link request failed:', err);

      enqueueSnackbar('Something went wrong. Please try again.', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="ml-[0.25in] mt-8 max-w-md">
        <h2 className="text-2xl font-semibold mb-4">
          Sign in to Progressive Spanish Learning
        </h2>

        <form onSubmit={requestLink} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Enter your email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400 focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Email Verification Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
