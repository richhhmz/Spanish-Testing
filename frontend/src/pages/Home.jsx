// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/AxiosClient';
import { getTodaysDate } from '../utils/Util.js';
import { setEffectiveUserId as cacheEffectiveUserId } from '../utils/User.js';
import { useSnackbar } from 'notistack';
import { DefaultHeader } from './DefaultHeader.jsx';
import { DefaultFooter } from './DefaultFooter.jsx';

const HomePage = () => {
  // Profile + auth state
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [realUserId, setRealUserId] = useState(null);
  const [effectiveUserId, setEffectiveUserIdState] = useState(null);

  // Impersonation input
  const [impersonateUser, setImpersonateUser] = useState('');

  // Subscription state (for the effective user)
  const [subscriptionStatus, setSubscriptionStatus] = useState('none');
  const [subscriptionPlan, setSubscriptionPlan] = useState('');

  // Admin subscription control panel state
  // 🔒 IMPORTANT: starts empty and is NEVER auto-filled from effectiveUserId
  const [subTargetUserId, setSubTargetUserId] = useState('');
  const [subStatus, setSubStatus] = useState('none');
  const [subPlan, setSubPlan] = useState('');

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  /* ---------------------------------------------------------
     STEP 1: Ask backend who we are (authoritative)
     --------------------------------------------------------- */
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

        // Cache effective user globally for other components
        cacheEffectiveUserId(res.data.effectiveUserId);
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setLoading(false);

        if (err.response?.status === 401) {
          enqueueSnackbar('Your session has expired. Please sign in again.', {
            variant: 'info',
          });
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
  }, [enqueueSnackbar, navigate]);

  /* ---------------------------------------------------------
     STEP 2: Load profile & subscription for EFFECTIVE user
     --------------------------------------------------------- */
  useEffect(() => {
    if (!effectiveUserId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/spanish/getProfile');
        const profile = res.data.data;

        // Strip Mongo IDs on the client
        const { _id, __v, ...profileWithoutId } = profile;

        const updatedProfile = {
          ...profileWithoutId,
          lastVisitDate: getTodaysDate(),
        };

        // Persist lastVisitDate
        await axios.put('/api/spanish/updateProfile', updatedProfile);
        setProfileData(updatedProfile);

        // Subscription info (with backwards compatibility)
        const sub = profile.subscription || { status: 'none' };
        setSubscriptionStatus(sub.status || 'none');
        setSubscriptionPlan(sub.plan || '');
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
      window.location.href = '/';
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
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to stop impersonation');
    }
  };

  /* ---------------------------------------------------------
     Billing: Subscribe button (Stripe Checkout)
     --------------------------------------------------------- */
  const handleSubscribeClick = async () => {
    try {
      const res = await axios.post('/api/billing/create-checkout-session', {});
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        enqueueSnackbar('Unexpected response from billing API', {
          variant: 'error',
        });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(
        err.response?.data?.error || 'Failed to start checkout session',
        { variant: 'error' }
      );
    }
  };

  /* ---------------------------------------------------------
     Billing: Manage subscription (Stripe Customer Portal)
     --------------------------------------------------------- */
  const handleManageSubscriptionClick = async () => {
    try {
      BackLog("![handleManageSubscriptionClick] start");
      const res = await axios.post('/api/billing/customer-portal', {});
      BackLog("![handleManageSubscriptionClick] after /api/billing/customer-portal post");
      const url = res.data?.url;

      if (url) {
        window.location.href = url;
        return;
      }

      enqueueSnackbar('Unexpected response from billing API', {
        variant: 'error',
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(
        err.response?.data?.error || 'Failed to open subscription portal',
        { variant: 'error' }
      );
    }
  };

  /* ---------------------------------------------------------
     Admin: update subscription for an arbitrary user
     --------------------------------------------------------- */
  const handleAdminUpdateSubscription = async () => {
    const target = subTargetUserId.trim();
    if (!target) return;

    try {
      await axios.post('/admin/set-subscription', {
        targetUserId: target,
        status: subStatus,
        plan: subPlan || undefined,
      });

      enqueueSnackbar('Subscription updated', { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(
        err.response?.data?.error || 'Failed to update subscription',
        { variant: 'error' }
      );
    }
  };

  /* --------------------------------------------------------- */

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading…</div>;
  }

  const displayName =
    profileData?.userPreferredName?.trim()
      ? profileData.userPreferredName
      : effectiveUserId;

  // Non-admin users must have an active subscription to see the menu
  const hasActiveSub = subscriptionStatus === 'active';
  const canSeeMenu = isAdmin || hasActiveSub;

  // Only show Manage Subscription when it’s likely to work
  // (i.e., they’re active OR they’re admin for testing)
  const showManageSubscription = hasActiveSub || isAdmin;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <DefaultHeader />

      {/* Impersonation banner */}
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

      <h1 className="text-3xl font-bold mb-4 text-gray-800">
        Welcome, {displayName.split('@')[0]}
      </h1>

      <h2 className="text-xl text-gray-700 mb-8 text-center">
        Learn the meaning of up to 10,000 of the most common Spanish words.
      </h2>

      {/* ADMIN IMPERSONATION PANEL (only when not already impersonating) */}
      {isAdmin && !impersonating && (
        <div className="w-full max-w-md bg-yellow-50 border border-yellow-300 rounded-xl mb-6 p-4">
          <h3 className="text-lg font-semibold mb-2">Impersonate User</h3>

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

      {/* ADMIN SUBSCRIPTION CONTROL PANEL */}
      {isAdmin && (
        <div className="w-full max-w-md bg-blue-50 border border-blue-200 rounded-xl mb-6 p-4">
          <h3 className="text-lg font-semibold mb-3">
            Subscription Control (Admin)
          </h3>

          <div className="mb-3 text-sm text-gray-700">
            Set subscription for a specific user.
          </div>

          {/* TARGET USER ID — starts EMPTY and is never auto-filled */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Target User ID
            </label>
            <input
              type="text"
              value={subTargetUserId}
              onChange={(e) => setSubTargetUserId(e.target.value)}
              placeholder="e.g. sparky"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* STATUS */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={subStatus}
              onChange={(e) => setSubStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="none">none</option>
              <option value="active">active</option>
              <option value="canceled">canceled</option>
              <option value="past_due">past_due</option>
            </select>
          </div>

          {/* PLAN */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Plan (optional)
            </label>
            <input
              type="text"
              value={subPlan}
              onChange={(e) => setSubPlan(e.target.value)}
              placeholder="e.g. monthly"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* ACTION BUTTON */}
          <button
            disabled={!subTargetUserId.trim()}
            onClick={handleAdminUpdateSubscription}
            className={`w-full px-4 py-2 rounded text-white ${
              subTargetUserId.trim()
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Update subscription
          </button>
        </div>
      )}

      {/* SUBSCRIBE CTA
          - For non-admins, or for admins who are IMPERSONATING
          - Hide if the (effective) user already has an active subscription
      */}
      {(!isAdmin || impersonating) && !hasActiveSub && (
        <div className="w-full max-w-2xl mb-8">
          <button
            onClick={handleSubscribeClick}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
          >
            Subscribe – $5/month
          </button>
        </div>
      )}

      {/* If user is not subscribed and not admin, hide the menu */}
      {!canSeeMenu && (
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-4 mb-8 text-center text-gray-700">
          You don&apos;t have an active subscription yet.
          <br />
          Please subscribe above to unlock the full site.
        </div>
      )}

      {/* MENU */}
      {canSeeMenu && (
        <nav className="w-full max-w-md bg-white shadow rounded-2xl mb-8">
          <ul className="divide-y">
            <li>
              <Link
                to="/spanish/todaysSpanishTests"
                className="block py-4 text-center text-blue-600 hover:bg-blue-50"
              >
                Today&apos;s Tests
              </Link>
            </li>
            <li>
              <Link
                to="/spanish/quickWordLookup"
                className="block py-4 text-center text-blue-600 hover:bg-blue-50"
              >
                Quick Word Lookup
              </Link>
            </li>
            <li>
              <Link
                to="/spanish/translationSearch"
                className="block py-4 text-center text-blue-600 hover:bg-blue-50"
              >
                Translation Search
              </Link>
            </li>
            <li>
              <Link
                to="/spanish/allSpanishTests"
                className="block py-4 text-center text-blue-600 hover:bg-blue-50"
              >
                All Tests
              </Link>
            </li>
            <li>
              <Link
                to="/spanish/editProfile"
                className="block py-4 text-center text-blue-600 hover:bg-blue-50"
              >
                Your Profile
              </Link>
            </li>

            {/* NEW MENU ITEM: Manage Subscription */}
            {showManageSubscription && (
              <li>
                <button
                  onClick={handleManageSubscriptionClick}
                  className="block w-full py-4 text-center text-blue-600 hover:bg-blue-50 rounded-b-2xl"
                >
                  Manage Subscription
                </button>
              </li>
            )}

            {/* If manage subscription is NOT shown, keep Your Profile rounded */}
            {!showManageSubscription && (
              <li className="hidden" />
            )}
          </ul>
        </nav>
      )}

      <DefaultFooter />
    </div>
  );
};

export default HomePage;
