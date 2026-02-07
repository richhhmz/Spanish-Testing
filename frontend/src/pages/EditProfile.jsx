import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { setEffectiveUserId } from '../utils/User.js';

export const EditProfile = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [maxWords, setMaxWords] = useState(20);

  const STEP = 5;
  const MIN_LIMIT = 5;
  const MAX_LIMIT = 100;

  /* ───────────────────────── Fetch profile ───────────────────────── */

  useEffect(() => {
    const initAndFetchProfile = async () => {
      setLoading(true);
      try {
        const whoRes = await axios.get('/api/auth/effective-user');
        // console.log(`EditProfile.jsx effectiveUserId=${whoRes.data.effectiveUserId}`);
        setEffectiveUserId(whoRes.data.effectiveUserId);
        const profileRes = await axios.get('/api/spanish/getProfile');
        const data = profileRes.data.data;
        // console.log(`EditProfile getProfileData=${JSON.stringify(profileRes.data.data,2,null)}`);

        setProfileData(data);
        setMaxWords(data.testsPerDay || 20);
      } catch (err) {
        console.error(err);
        enqueueSnackbar(
          'An error happened while fetching profile.',
          { variant: 'error' }
        );
      } finally {
        setLoading(false);
      }
    };

    initAndFetchProfile();
  }, [enqueueSnackbar]);

  /* ───────────────────────── Counter logic ───────────────────────── */

  const handleValueChange = (change) => {
    setMaxWords((prev) => {
      const next = prev + change;
      if (next < MIN_LIMIT || next > MAX_LIMIT) return prev;

      setProfileData((prevProfile) => ({
        ...prevProfile,
        testsPerDay: next,
      }));

      return next;
    });
  };

  /* ───────────────────────── Save profile ───────────────────────── */

  const handleProfileUpdate = async () => {
    const { _id, __v, ...profileWithoutId } = profileData;
    const updatedProfile = {
      ...profileWithoutId,
      userPreferredName:
        document.getElementById('userPreferredName')?.value.trim() || '',
    };

    setLoading(true);
    try {
      await axios.put('/api/spanish/updateProfile', updatedProfile);

      enqueueSnackbar('Profile updated successfully', {
        variant: 'success',
      });

      // 🔁 FULL reload so Home re-initializes impersonation
      window.location.href = '/spanish/home';
    } catch (error) {
      enqueueSnackbar('Error updating profile', {
        variant: 'error',
      });
      console.error(error);
      setLoading(false);
    }
  };

  if (loading || !profileData) {
    return <Spinner />;
  }

  const truncate = (str) =>
    str && str.length > 15 ? str.substring(0, 15) + '…' : str;

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow border border-gray-400">
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Edit Profile
      </h2>

      <div className="grid grid-cols-[130px_1fr] gap-y-3 mb-6">
        <div className="text-right font-semibold pr-2">User ID:</div>
        <div className="truncate">
          {truncate(profileData.userId)}
        </div>

        <div className="text-right font-semibold pr-2">
          Preferred Name:
        </div>
        <div className="flex items-center gap-2">
          <input
            id="userPreferredName"
            type="text"
            className="border border-gray-300 rounded px-2 py-1 w-1/2"
            defaultValue={profileData.userPreferredName || ''}
          />
          <span className="text-sm text-gray-500">
            for example, your first name or nickname
          </span>
        </div>

        <div className="text-right font-semibold pr-2">
          Max Daily Words:
        </div>
        <div className="flex items-center space-x-2 border border-gray-300 rounded w-28 p-1">
          <button
            onClick={() => handleValueChange(-STEP)}
            disabled={maxWords <= MIN_LIMIT}
            className={`p-1 rounded-full text-lg ${
              maxWords <= MIN_LIMIT
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-gray-100'
            }`}
          >
            −
          </button>

          <span className="flex-1 text-center font-bold">
            {maxWords}
          </span>

          <button
            onClick={() => handleValueChange(STEP)}
            disabled={maxWords >= MAX_LIMIT}
            className={`p-1 rounded-full text-lg ${
              maxWords >= MAX_LIMIT
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-gray-100'
            }`}
          >
            +
          </button>
        </div>

        <div className="text-right font-semibold pr-2">
          Last Test Date:
        </div>
        <div className="truncate">
          {truncate(profileData.lastTestDate)}
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-8 pb-2">
        <button
          onClick={handleProfileUpdate}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded-md"
        >
          Save
        </button>
        <button
          onClick={() => {
            // 🔁 FULL reload on cancel as well
            window.location.href = '/spanish/home';
          }}
          className="bg-gray-300 hover:bg-gray-400 text-black font-semibold px-3 py-1 rounded-md"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
