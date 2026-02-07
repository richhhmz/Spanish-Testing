import mongoose from 'mongoose';

export const TestSchema = mongoose.Schema(
    {
        word: {
            type: String,
            required: true,
            index: true,
            unique: true,
        },
        rank: {
            type: Number,
            required: true,
            index: true,
            unique: true,
        },
        lastTestDate: {
            type: String,
            required: true,
            index: true,
        },
        previousTestDate: { // test date before lastTestDate
            type: String,
            required: true,
            index: true,
        },
        averageDaysBetweenTests: {
            type: Number,
            required: true,
        },
        numberOfTrials: {
            type: Number,
            required: true,
        },
        userNotes: {
            type: String,
            required: false,
        },
        testCompleted: { // true if test was completed on spanishTestDate
            type: Boolean,
            required: true,
            default: false,
        },
    }
);