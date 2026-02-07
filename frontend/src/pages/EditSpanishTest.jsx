import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import axios from '../api/AxiosClient';
import EditSpanishTestHtml from '../components/htmlComponents/EditSpanishTestHtml.jsx';
import { useParams } from 'react-router-dom';
import { setEffectiveUserId } from '../utils/User.js';

export const EditSpanishTest = () => {
  const { word, source } = useParams();
  const [loading, setLoading] = useState(false);
  const [editSpanishTestData, setEditSpanishTestData] = useState(null);

  useEffect(() => {
    const initAndFetch = async () => {
      setLoading(true);
      try {
        const whoRes = await axios.get('/auth/effective-user');
        setEffectiveUserId(whoRes.data.effectiveUserId);
        const res = await axios.get(`/api/spanish/getTest/${word}`);
        setEditSpanishTestData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initAndFetch();
  }, [word]);

  return (
    <div>
      {loading && <Spinner />}
      {editSpanishTestData && (
        <EditSpanishTestHtml
          editSpanishTestData={editSpanishTestData}
          word={word}
          source={source}
        />
      )}
    </div>
  )
}
