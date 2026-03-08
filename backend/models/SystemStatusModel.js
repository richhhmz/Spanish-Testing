import mongoose from 'mongoose';

export const SystemStatusSchema = new mongoose.Schema(
  {
    lastRecordedDateUTC: {
      type: String,
      required: true,
    },
  }
);
