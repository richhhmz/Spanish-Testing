import React, { useState, useEffect } from 'react';
import { DefaultHeader } from '../../pages/DefaultHeader.jsx';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';
import axios from '../../api/AxiosClient';
import { useSnackbar } from 'notistack';

const MessageListHtml = ({ messageListData }) => {
  // Messages rows
  const [rows, setRows] = useState(
    Array.isArray(messageListData) ? messageListData : []
  );

  // Profile + loading
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Add-message form
  const [addForm, setAddForm] = useState({
    messageType: '',
    messageFrom: '',
    messageTo: '',
    subject: '',
    message: '',
  });

  const [isAdding, setIsAdding] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  // Keep internal rows in sync with incoming prop
  useEffect(() => {
    setRows(Array.isArray(messageListData) ? messageListData : []);
  }, [messageListData]);

  // Fetch profile (for isAdmin)
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const profileRes = await axios.get('/api/spanish/getProfile');
        const data = profileRes.data.data;
        setProfile(data);
      } catch (err) {
        console.error(err);
        enqueueSnackbar('An error happened while fetching profile.', {
          variant: 'error',
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [enqueueSnackbar]);

  // Format date as mm/dd/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return '';

    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) {
      // If string cannot be parsed, show raw value
      return dateString;
    }

    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();

    return `${month}/${day}/${year}`;
  };

  const handleAddFormChange = (field) => (e) => {
    setAddForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const resetAddForm = () => {
    setAddForm({
      messageType: '',
      messageFrom: '',
      messageTo: '',
      subject: '',
      message: '',
    });
  };

  const handleAddMessage = async () => {
    // Basic validation: required fields
    if (!addForm.messageType || !addForm.messageFrom || !addForm.messageTo || !addForm.message) {
      enqueueSnackbar('Type, From, To, and Message are required.', {
        variant: 'warning',
      });
      return;
    }

    try {
      const response = await axios.post('/api/addMessage', {
        messageType: addForm.messageType,
        messageFrom: addForm.messageFrom,
        messageTo: addForm.messageTo,
        subject: addForm.subject,
        message: addForm.message,
      });

      const saved = response.data.data;

      // Prepend the new message to the list so it appears at the top
      setRows((prev) => [saved, ...prev]);

      // Clear the form and hide the add row
      resetAddForm();
      setIsAdding(false);

      enqueueSnackbar('Message added.', { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to add message.', { variant: 'error' });
    }
  };

  const handleCancelAdd = () => {
    resetAddForm();
    setIsAdding(false);
  };

  const handleDeleteMessage = async (id) => {
    if (!id) return;

    const confirmed = window.confirm('Delete this message?');
    if (!confirmed) return;

    try {
      const response = await axios.post('/api/deleteMessage', { messageId: id });

      if (response.status === 200) {
        setRows((prev) => prev.filter((m) => m._id !== id));
        enqueueSnackbar('Message deleted.', { variant: 'success' });
      } else {
        enqueueSnackbar('Failed to delete message.', { variant: 'error' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to delete message.', { variant: 'error' });
    }
  };

  const renderMessagesTable = () => {
    const isAdmin = !!profile?.isAdmin;

    return (
      <div className="ml-[0.5in]">
        {loadingProfile && (
          <p className="text-sm text-gray-600 mb-2">Loading profile...</p>
        )}

        {isAdmin && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Message
            </button>
          </div>
        )}

        <table className="table-auto border border-gray-300 w-auto mb-4">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                New
              </th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                Type
              </th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                Date
              </th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                From
              </th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                To
              </th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                Subject
              </th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                Message
              </th>
            </tr>
          </thead>
          <tbody>
            {isAdmin && isAdding && (
              <tr>
                {/* New column is for "NEW" flags in real rows, leave blank here */}
                <td className="px-3 py-2 border border-gray-300 text-center text-xs text-gray-500">
                  {/* empty for add row */}
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  <input
                    type="text"
                    className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                    value={addForm.messageType}
                    onChange={handleAddFormChange('messageType')}
                    placeholder="system / user"
                  />
                </td>

                {/* Date column is auto-filled in backend – don't show anything here */}
                <td className="px-3 py-2 border border-gray-300 text-xs text-gray-500 whitespace-nowrap">
                  {/* intentionally blank */}
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  <input
                    type="text"
                    className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                    value={addForm.messageFrom}
                    onChange={handleAddFormChange('messageFrom')}
                    placeholder="from"
                  />
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  <input
                    type="text"
                    className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                    value={addForm.messageTo}
                    onChange={handleAddFormChange('messageTo')}
                    placeholder="to"
                  />
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  <input
                    type="text"
                    className="w-48 px-2 py-1 border border-gray-300 rounded text-sm"
                    value={addForm.subject}
                    onChange={handleAddFormChange('subject')}
                    placeholder="subject"
                  />
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  <div className="flex items-start gap-2">
                    <textarea
                      className="w-64 px-2 py-1 border border-gray-300 rounded text-sm"
                      rows={2}
                      value={addForm.message}
                      onChange={handleAddFormChange('message')}
                      placeholder="message"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={handleAddMessage}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAdd}
                        className="px-3 py-1 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {rows.map((msg, index) => (
              <tr key={msg._id || index}>
                <td className="px-3 py-2 border border-gray-300 text-center">
                  {msg.messageNew === 'new' ? (
                    <span className="text-xs font-semibold text-red-600">
                      NEW
                    </span>
                  ) : (
                    ''
                  )}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {msg.messageType}
                </td>
                <td className="px-3 py-2 border border-gray-300 whitespace-nowrap">
                  {formatDate(msg.messageDateAndTime)}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {msg.messageFrom}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {msg.messageTo}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {msg.subject}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  <div className="flex items-start gap-2">
                    <div className="whitespace-pre-line flex-1">
                      {msg.message}
                    </div>
                    {profile?.isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg._id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <DefaultHeader />

      <div className="mb-6">
        <h1 className="text-3xl font-bold ml-[1.75in]">
          Message List
        </h1>
      </div>

      {renderMessagesTable()}

      <DefaultFooter />
    </div>
  );
};

export default MessageListHtml;
