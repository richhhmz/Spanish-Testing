import { MessageSchema } from '../models/MessageModel.js';

export const getMessages = async (messagesDBConnection) => {
  const messageModel = messagesDBConnection.model('Message', MessageSchema);
  const messages = await messageModel.find({});

  messages.sort((a, b) =>
    b.messageDateAndTime.localeCompare(a.messageDateAndTime) // descending
  );

  return messages;
};

export const addMessage = async (messagesDBConnection, messageData) => {
  const messageModel = messagesDBConnection.model('Message', MessageSchema);

  const now = new Date();

  const newMessage = new messageModel({
    messageNew: '', // blank per requirement
    messageType: messageData.messageType,
    messageDateAndTime: now.toISOString(), // sortable, ISO-safe
    messageFrom: messageData.messageFrom,
    messageTo: messageData.messageTo,
    subject: messageData.subject || '',
    message: messageData.message,
  });

  const savedMessage = await newMessage.save();
  return savedMessage;
};

export const deleteMessage = async (messagesDBConnection, messageId) => {
  const messageModel = messagesDBConnection.model('Message', MessageSchema);

  // Returns the deleted document, or null if not found
  const deleted = await messageModel.findByIdAndDelete(messageId);
  return deleted;
};
