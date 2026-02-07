import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import axios from '../api/AxiosClient';
import { useParams } from 'react-router-dom';
import ViewSpanishTestHtml from '../components/htmlComponents/ViewSpanishTestHtml.jsx';
import { homeIfNotToday } from '../utils/Util.js';
import { setEffectiveUserId } from '../utils/User.js';

export const ViewSpanishTest = () => {
  const { word, source } = useParams();

  const [loading, setLoading] = useState(false);
  const [viewSpanishTestData, setViewSpanishTestData] = useState(null);

  // Enforce daily Home visit
  useEffect(() => {
    const runGuard = async () => {
      await homeIfNotToday();
    };
    runGuard();
  }, []);

  useEffect(() => {
    const initAndFetchTest = async () => {
      setLoading(true);
      try {
        const whoRes = await axios.get('/auth/effective-user');
        setEffectiveUserId(whoRes.data.effectiveUserId);
        const response = await axios.get(`/api/spanish/getTest/${word}`);
        setViewSpanishTestData(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    initAndFetchTest();
  }, [word]);

  return (
    <div>
      {loading && <Spinner />}
      {viewSpanishTestData && (
        <ViewSpanishTestHtml
          viewSpanishTestData={viewSpanishTestData}
          word={word}
          source={source}
        />
      )}
    </div>
  );
};
