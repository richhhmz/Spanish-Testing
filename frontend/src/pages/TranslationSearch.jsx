import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner.jsx';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import TranslationSearchHtml from '../components/htmlComponents/TranslationSearchHtml.jsx';
import { homeIfNotToday } from '../utils/Util.js';

export const TranslationSearch = () => {
  const [loading, setLoading] = useState(false);
  const [allSpanishWordsData, setAllSpanishWordsData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    homeIfNotToday();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        enqueueSnackbar('Loading Translation Search...', {
          variant: 'info',
          autoHideDuration: 2000,
        });

        const response = await axios.get('/api/spanish/allSpanishWords');

        setAllSpanishWordsData(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      {loading && <Spinner />}
      {allSpanishWordsData && (
        <TranslationSearchHtml allSpanishWordsData={allSpanishWordsData} />
      )}
    </div>
  );
};
