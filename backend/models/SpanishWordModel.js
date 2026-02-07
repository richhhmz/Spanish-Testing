import mongoose from "mongoose";

// Entry Schema (Sub-document)
const EntrySchema = new mongoose.Schema({
  lemma: { type: String },
  clitics: { type: [String] },
  pos: { type: String, required: true },
  mood: { type: String },
  tense: { type: String },
  person: { type: String },
  number: { type: String },
  gender: { type: String },
  voseo: { type: Boolean },
  variety: { type: String },
  gloss: { type: String, required: true },
  example: { type: String },
  translation: { type: String },
}, { _id: false });

// Main Word Schema
export const WordSchema = new mongoose.Schema({
  word: { type: String, required: true, index: true, unique: true },
  rank: { type: Number, required: true, unique: true },
  entries: { type: [EntrySchema], required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String },
});
