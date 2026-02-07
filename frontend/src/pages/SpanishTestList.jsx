import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner.jsx';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import SpanishTestListHtml from '../components/htmlComponents/SpanishTestListHtml.jsx';
import { homeIfNotToday } from '../utils/Util.js';
import { setEffectiveUserId, setRealUserId } from '../utils/User.js';

export const SpanishTestList = () => {
  const [loading, setLoading] = useState(false);
  const [allSpanishTestsData, setAllSpanishTestsData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const initAndFetch = async () => {
      setLoading(true);

      try {
        // 1) PRIME impersonation / identity so AxiosClient sends correct headers
        const whoRes = await axios.get('/auth/effective-user');

        // These setters should exist in your current User.js
        // (You showed setEffectiveUserId + setRealUserId earlier)
        if (whoRes?.data?.realUserId) setRealUserId(whoRes.data.realUserId);
        if (whoRes?.data?.effectiveUserId) setEffectiveUserId(whoRes.data.effectiveUserId);

        // 2) Enforce daily Home visit AFTER identity is set
        await homeIfNotToday();

        // 3) Load data using AxiosClient (relative URL, not localhost absolute)
        enqueueSnackbar('Loading All Tests...', {
          variant: 'info',
          autoHideDuration: 3000,
        });

        const response = await axios.get('/api/spanish/allSpanishTests');
        setAllSpanishTestsData(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    initAndFetch();
  }, [enqueueSnackbar]);

  return (
    <div>
      {loading && <Spinner />}
      {allSpanishTestsData && (
        <SpanishTestListHtml allSpanishTestsData={allSpanishTestsData} />
      )}
    </div>
  );
};
