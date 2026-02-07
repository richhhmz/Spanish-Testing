import { WordSchema } from '../models/SpanishWordModel.js';
import { getWords, setWords } from './cache.js';

export const getAllSpanishWords = async (spanishWordsDBConnection) => {
    // If we already have a cached copy, return it immediately
    if (getWords()) {
        // console.log("getAllSpanishWords getting from cache");
        return getWords();
    }

    // console.log("getAllSpanishWords getting from database");
    const spanishWordModel = spanishWordsDBConnection.model("Word", WordSchema);
    const spanishWords = await spanishWordModel.find({});

    spanishWords.sort((a, b) =>
        a.word.localeCompare(b.word, 'es', { sensitivity: 'accent' })
    );

    // Save to global cache
    setWords(spanishWords);

    return spanishWords;
};

export const updateWord = async (word, spanishWordsDBConnection, data) => {
  const Word = spanishWordsDBConnection.model('Word', WordSchema);

  const updatedWordDoc = await Word.findOneAndUpdate(
    { word },                // find by word
    {
      ...data.wordDoc,       // 👈 FULL replacement
      updatedAt: new Date(), // optional but recommended
    },
    {
      new: true,
      runValidators: true,   // ensure schema integrity
    }
  );

  if (!updatedWordDoc) {
    return { status: 400, message: 'Word not found' };
  }

  return updatedWordDoc;
};

