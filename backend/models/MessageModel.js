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
      required: true,
    },
    messageTo: { // pong, all, user
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
  },
);
