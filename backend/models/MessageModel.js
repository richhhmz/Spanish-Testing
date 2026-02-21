import mongoose from 'mongoose';

export const MessageSchema = new mongoose.Schema(
  {
    messageNew: { // "new" if new else blank
      type: String,
      required: false,
    },
    messageType: { // system, ping, user, broadcast
      type: String,
      required: true,
    },
    messageDateAndTime: {
      type: String,
      required: true,
    },
    messageFrom: { // ping, system, user
      type: String,
      required: false,
    },
    messageTo: { // pong, all, user
      type: String,
      required: false,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
);
