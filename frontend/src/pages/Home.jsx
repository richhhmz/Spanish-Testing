import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/AxiosClient';
import rawAxios from 'axios';
import { getTodaysDate } from '../utils/Util.js';
import { setEffectiveUserId } from '../utils/User.js';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { BackLog } from '../utils/BackLog.js';

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [realUserId, setRealUserId] = useState(null);
  const [effectiveUserId, setEffectiveUserIdState] = useState(null);

  const [impersonateUser, setImpersonateUser] = useState('');

  /* ---------------------------------------------------------
     STEP 1: Ask backend who we are (authoritative)
     --------------------------------------------------------- */
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const initUser = async () => {
      try {
        const res = await axios.get('/auth/effective-user');
        if (cancelled) return;

        setRealUserId(res.data.realUserId);
        setEffectiveUserIdState(res.data.effectiveUserId);
        setIsAdmin(res.data.isAdmin);
        setImpersonating(res.data.impersonating);

        // Cache effective user globally
        setEffectiveUserId(res.data.effectiveUserId);
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setLoading(false);

        if (err.response?.status === 401) {
          enqueueSnackbar(
            'Your session has expired. Please sign in again.',
            { variant: 'info' }
          );

          navigate('/login?reason=session-expired', { replace: true });
        } else {
          enqueueSnackbar(
            'Failed to determine user identity. Please sign in again.',
            { variant: 'error' }
          );

          navigate('/login?reason=auth-failed', { replace: true });
        }
      }
    };

    initUser();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------
     STEP 2: Load profile for EFFECTIVE user
     --------------------------------------------------------- */
  useEffect(() => {
    if (!effectiveUserId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/spanish/getProfile');
        const profile = res.data.data;
        const { _id, __v, ...profileWithoutId } = profile;

        const updatedProfile = {
          ...profileWithoutId,
          lastVisitDate: getTodaysDate(),
        };

        await axios.put('/api/spanish/updateProfile', updatedProfile);
        setProfileData(updatedProfile);
      } catch (err) {
        console.error(err);
        alert('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [effectiveUserId]);

  /* ---------------------------------------------------------
     Admin → start impersonation
     --------------------------------------------------------- */
  const handleImpersonateSubmit = async (e) => {
    e.preventDefault();
    if (!impersonateUser.trim()) return;

    try {
      await axios.post('/admin/impersonate', {
        targetUserId: impersonateUser.trim(),
      });

      // HARD reload → resets all frontend state cleanly
      window.location.href = '/spanish/home';
    } catch (err) {
      console.error(err);
      alert('Impersonation failed');
    }
  };

  /* ---------------------------------------------------------
     Admin → stop impersonation
     --------------------------------------------------------- */
  const handleStopImpersonating = async () => {
    try {
      await axios.post('/admin/reset-impersonation');
      window.location.href = '/spanish/home';
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to stop impersonation');
    }
  };

  /* --------------------------------------------------------- */

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">

      { }
      {impersonating && (
        <div className="w-full max-w-2xl bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded mb-6 flex justify-between items-center">
          <div>
            <strong>Impersonating:</strong> {effectiveUserId}
            <span className="ml-2 text-sm text-red-600">
              (real user: {realUserId})
            </span>
          </div>
          <button
            onClick={handleStopImpersonating}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop
          </button>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Welcome,&nbsp;
        {profileData?.userPreferredName?.trim()
          ? profileData.userPreferredName
          : effectiveUserId}
      </h1>

      <h2 className="text-xl text-gray-700 mb-10 text-center">
        Learn the meaning of up to 10,000 of the most common Spanish words.
      </h2>

      {/* ADMIN IMPERSONATION PANEL */}
      {isAdmin && !impersonating && (
        <div className="w-full max-w-md bg-yellow-50 border border-yellow-300 rounded-xl mb-8 p-4">
          <h3 className="text-lg font-semibold mb-2">
            Impersonate User
          </h3>

          <form onSubmit={handleImpersonateSubmit} className="flex gap-2">
            <input
              type="text"
              value={impersonateUser}
              onChange={(e) => setImpersonateUser(e.target.value)}
              placeholder="User ID"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Go
            </button>
          </form>
        </div>
      )}

      {/* MENU */}
      <nav className="w-full max-w-md bg-white shadow rounded-2xl">
        <ul className="divide-y">
          <li><Link to="/spanish/todaysSpanishTests" className="block py-4 text-center text-blue-600 hover:bg-blue-50">Today's Tests</Link></li>
          <li><Link to="/spanish/quickWordLookup" className="block py-4 text-center text-blue-600 hover:bg-blue-50">Quick Word Lookup</Link></li>
          <li><Link to="/spanish/translationSearch" className="block py-4 text-center text-blue-600 hover:bg-blue-50">Translation Search</Link></li>
          <li><Link to="/spanish/allSpanishTests" className="block py-4 text-center text-blue-600 hover:bg-blue-50">All Tests</Link></li>
          <li><Link to="/spanish/editProfile" className="block py-4 text-center text-blue-600 hover:bg-blue-50 rounded-b-2xl">Your Profile</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default HomePage;
