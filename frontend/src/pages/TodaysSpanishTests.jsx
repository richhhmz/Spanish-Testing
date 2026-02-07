import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner.jsx';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import TodaysSpanishTestsHtml from '../components/htmlComponents/TodaysSpanishTestsHtml.jsx';
import { homeIfNotToday } from '../utils/Util.js';
import { setEffectiveUserId } from '../utils/User.js';
import { isDebug } from '../globals.js';
import { BackLog } from '../utils/BackLog.js';

export const TodaysSpanishTests = () => {
  const [loading, setLoading] = useState(false);
  const [todaysTestsData, setTodaysTestsData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  var newDay = false;

  // Enforce daily Home visit
  useEffect(() => {
    const runGuard = async () => {
      if (isDebug) BackLog("Checking if not today.");
      newDay = await homeIfNotToday(enqueueSnackbar);
      if (newDay) {
        if (isDebug) BackLog("New day detected — terminating effects");
        return; // 🛑 STOP HERE
      }
      if (isDebug) BackLog("End today check");
    };
    runGuard();
  }, []);

  useEffect(() => {
    const initAndFetchTests = async () => {
      setLoading(true);
      try {
        enqueueSnackbar("Loading Today's Tests...", {
          variant: "info",
          autoHideDuration: 2000,
        });

        // 1️⃣ Establish impersonation context
        const whoRes = await axios.get('/auth/effective-user');
        setEffectiveUserId(whoRes.data.effectiveUserId);

        // 2️⃣ Fetch tests using AxiosClient + relative URL
        const response = await axios.get('/api/spanish/todaysSpanishTests');

        setTodaysTestsData(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    initAndFetchTests();
  }, [enqueueSnackbar]);

  return (
    <div>
      {loading && <Spinner />}
      {todaysTestsData && (
        <TodaysSpanishTestsHtml todaysTestsData={todaysTestsData} />
      )}
    </div>
  );
};
