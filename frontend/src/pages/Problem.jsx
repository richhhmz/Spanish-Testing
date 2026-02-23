// frontend/src/pages/Problem.jsx

import React, { useState, useEffect } from 'react';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { DefaultHeader } from './DefaultHeader.jsx';

const MAX_SUBJECT = 50;
const MAX_MESSAGE = 1000;
const REDIRECT_SECONDS = 10;

const Problem = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [userEmail, setUserEmail] = useState('');

  // Load current user ID (which is an email) once
  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        const res = await axios.get('/auth/effective-user');
        if (cancelled) return;

        // effectiveUserId is actually an email address and is what we want
        const id = res.data?.effectiveUserId;
        setUserEmail(id);
      } catch (err) {
        console.error('[Problem] failed to load effective user:', err);
        // Optional: we can still allow anonymous-ish problem reports
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!showModal) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showModal, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject.trim()) {
      enqueueSnackbar('Subject is required.', { variant: 'warning' });
      return;
    }

    if (!message.trim()) {
      enqueueSnackbar('Message is required.', { variant: 'warning' });
      return;
    }

    try {
      setSubmitting(true);

      await axios.post('/problem', {
        subject: `Problem reported by ${userEmail}`,
        message: {subject: subject.trim(), message: message.trim()},
        userEmail: userEmail,
      });

      enqueueSnackbar('Problem report submitted.', {
        variant: 'success',
      });

      setCountdown(REDIRECT_SECONDS);
      setShowModal(true);

    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.error || 'Failed to submit problem report.',
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DefaultHeader />

      <div className="max-w-2xl mx-auto px-4 mt-12">
        <h1 className="text-2xl font-semibold mb-6">
          Report a Problem
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SUBJECT */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Subject (required)
            </label>

            <input
              type="text"
              value={subject}
              maxLength={MAX_SUBJECT}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Brief description of the issue"
            />

            <div className="text-xs text-gray-500 text-right mt-1">
              {subject.length} / {MAX_SUBJECT}
            </div>
          </div>

          {/* MESSAGE */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Message (required)
            </label>

            <textarea
              value={message}
              maxLength={MAX_MESSAGE}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full border rounded px-3 py-2"
              placeholder="Describe the issue in detail..."
            />

            <div className="text-xs text-gray-500 text-right mt-1">
              {message.length} / {MAX_MESSAGE}
            </div>
          </div>

          {/* SUBMIT */}
          <div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

        </form>
      </div>

      {/* THANK-YOU MODAL WITH COUNTDOWN */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4 text-center">
            <p className="mb-4">
              Thank you for reporting this problem. It will be forwarded to our review team for resolution.
            </p>
            <p className="text-sm text-gray-600">
              Redirecting to home in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Problem;