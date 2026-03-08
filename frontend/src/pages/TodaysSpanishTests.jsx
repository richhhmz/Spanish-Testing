import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner.jsx';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import TodaysSpanishTestsHtml from '../components/htmlComponents/TodaysSpanishTestsHtml.jsx';
import { newDay } from '../utils/Util.js';
import { setEffectiveUserId } from '../utils/User.js';
import { getTodaysDate, getTimeNow } from '../utils/Util.js';
import { isDebug } from '../globals.js';
import { BackLog } from '../utils/BackLog.js';

export const TodaysSpanishTests = () => {
  const [loading, setLoading] = useState(false);
  const [todaysTestsData, setTodaysTestsData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const initAndFetchTests = async () => {
      setLoading(true);
      try {
        // Enforce daily Home visit
        await newDay(enqueueSnackbar);
        
        enqueueSnackbar("Loading Today's Tests...", {
          variant: "info",
          autoHideDuration: 2000,
        });

        // 1️⃣ Establish impersonation context
        const whoRes = await axios.get('/auth/effective-user');
        setEffectiveUserId(whoRes.data.effectiveUserId);

        // 2️⃣ Fetch tests using AxiosClient + relative URL
        const today = getTodaysDate();
        const timeNow = getTimeNow();
        const response = await axios.get(
          '/api/spanish/todaysSpanishTests',
          {
            params: {
              today,
              timeNow
            }
          }
        );

        setTodaysTestsData(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    initAndFetchTests();
    
    // ✅ check for new day every minute
    const interval = setInterval(() => {
      newDay(enqueueSnackbar);
    }, 60000);

    return () => clearInterval(interval);

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
