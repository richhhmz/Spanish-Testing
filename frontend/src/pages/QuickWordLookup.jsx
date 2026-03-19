import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner.jsx';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import QuickWordLookupHtml from '../components/htmlComponents/QuickWordLookupHtml.jsx';
import { newDay } from '../utils/Util.js';

export const QuickWordLookup = () => {
  const [loading, setLoading] = useState(true);
  const [allSpanishWordsData, setAllSpanishWordsData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  /**
   * Enforce daily Home visit (identity-aware)
   */
  useEffect(() => {
    const runGuard = async () => {
      try {
        await newDay(true, enqueueSnackbar);
      } catch (err) {
        console.error('newDay failed:', err);
      }
    };
    runGuard();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        enqueueSnackbar(
          'Loading Quick Word Lookup…',
          { variant: 'info', autoHideDuration: 2000 }
        );

        const response = await axios.get('/api/spanish/allSpanishWords');

        setAllSpanishWordsData(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enqueueSnackbar]);

  return (
    <div>
      {loading && <Spinner />}

      {!loading && allSpanishWordsData && (
        <QuickWordLookupHtml
          allSpanishWordsData={allSpanishWordsData}
        />
      )}
    </div>
  );
};
