import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner.jsx';
import axios from '../api/AxiosClient';
import { useSnackbar } from 'notistack';
import MessageListHtml from '../components/htmlComponents/MessageListHtml.jsx';
import { homeIfNotToday } from '../utils/Util.js';
import { setEffectiveUserId, setRealUserId } from '../utils/User.js';

export const MessageList = () => {
  const [loading, setLoading] = useState(false);
  const [messageListData, setMessageListData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const initAndFetch = async () => {
      setLoading(true);

      try {
        // 1) PRIME impersonation / identity so AxiosClient sends correct headers
        const whoRes = await axios.get('/auth/effective-user');

        if (whoRes?.data?.realUserId) {
          setRealUserId(whoRes.data.realUserId);
        }
        if (whoRes?.data?.effectiveUserId) {
          setEffectiveUserId(whoRes.data.effectiveUserId);
        }

        // 2) Enforce daily Home visit AFTER identity is set
        await homeIfNotToday();

        // 3) Load messages
        enqueueSnackbar('Loading Messages...', {
          variant: 'info',
          autoHideDuration: 3000,
        });

        const response = await axios.get('/api/messageList');
        setMessageListData(response.data.data);
      } catch (err) {
        console.error(err);
        enqueueSnackbar('An error happened while fetching messages.', {
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    initAndFetch();
  }, [enqueueSnackbar]);

  return (
    <div>
      {loading && <Spinner />}
      {messageListData && (
        <MessageListHtml messageListData={messageListData} />
      )}
    </div>
  );
};
