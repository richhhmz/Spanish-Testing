import mongoose from 'mongoose';

export const MessageSchema = new mongoose.Schema(
  {
    messageDate: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: false,
      unique: true,
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
