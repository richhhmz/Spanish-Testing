import { WordSchema } from '../models/SpanishWordModel.js'
import { TestSchema } from '../models/SpanishTestModel.js'
import { getProfile, updateProfile } from '../tools/UserProfile.js';
import { defaultLastTestDate, defaultPreviousTestDate, spanishTestingName } from '../config.js';
import { getAllSpanishWords } from '../tools/Words.js';
import { getTodaysDate } from './Util.js'
import sanitizeHtml from "sanitize-html";

export const getAllSpanishWordTests = async (userId, spanishWords, profilesDBConnection, spanishTestsDBConnection) => {
    const spanishTestModel = spanishTestsDBConnection.model(userId+spanishTestingName, TestSchema);
    const combinedPromises = spanishWords.map(async (wordDoc) => {
        var testDoc = await spanishTestModel.findOne({ word: wordDoc.word });
        var averageDaysBetweenTests = (wordDoc.rank*0.1) < 1?1:(wordDoc.rank*0.1);
        if(testDoc == null){
            const newTestDoc =
                {
                    word: wordDoc.word,
                    rank: wordDoc.rank,
                    lastTestDate: defaultLastTestDate,
                    previousTestDate: defaultPreviousTestDate,
                    averageDaysBetweenTests: averageDaysBetweenTests,
                    numberOfTrials: 0,
                    userNotes: '',
                    testCompleted: false,
                }
                testDoc = await spanishTestModel.create(newTestDoc);
        }
        const wordTestDoc = {
            wordDoc: wordDoc,
            testDoc: testDoc
        };
        return wordTestDoc;
    });
    const wordTestDocs = await Promise.all(combinedPromises);
    wordTestDocs.sort((a, b) =>
        a.wordDoc.word.localeCompare(b.wordDoc.word, 'es', { sensitivity: 'accent' })
    );
    return wordTestDocs;
}

export const getTodaysSpanishTests = async (userId, profilesDBConnection, spanishWordsDBConnection, spanishTestsDBConnection) => {
    const profile = await getProfile(userId, profilesDBConnection);
    const spanishWordModel = spanishWordsDBConnection.model("Word", WordSchema);
    const spanishTestModel = spanishTestsDBConnection.model(userId + spanishTestingName, TestSchema);
    const allSpanishWords = await getAllSpanishWords(spanishWordsDBConnection);

    var todaysTests = [];
    const todaysSpanishTests = await spanishTestModel.find({lastTestDate: getTodaysDate()});
    if (todaysSpanishTests.length > 0) {
        // We've already presented today's tests at least once, so list them again.
        for (var i = 0; i < todaysSpanishTests.length; i++) {
            var wordDoc = await spanishWordModel.findOne({ word: todaysSpanishTests[i].word });
            var testDoc = todaysSpanishTests[i];
            const wordTestDoc = {
                wordDoc: wordDoc,
                testDoc: testDoc
            };
            todaysTests.push(wordTestDoc);
        }
    }
    else {
        var todaysCandidates = [];
        var numberOfTestsAdded = 0;
        // Add a 10% random jitter to the target day.
        const minJitter = -0.10;
        const maxJitter = 0.10;
        const jitterRange = maxJitter - minJitter;
        const jitterFactor = (Math.random() * jitterRange) + minJitter;

        const allSpanishTests = await getAllSpanishWordTests(userId, allSpanishWords, profilesDBConnection, spanishTestsDBConnection);
        allSpanishTests.sort((a, b) => Number(a.wordDoc.rank) - Number(b.wordDoc.rank));
        for (var i = 0; i < allSpanishTests.length; i++) {
            const wordTestDoc = allSpanishTests[i];
            const targetDays = wordTestDoc.testDoc.averageDaysBetweenTests;
            const dueTarget = targetDays * (1 + jitterFactor);
            if (daysSince(wordTestDoc.testDoc.lastTestDate) >= dueTarget) {
                todaysCandidates.push(wordTestDoc);
            }
        }
        for (var i = 0; i < todaysCandidates.length; i++) {
            numberOfTestsAdded++;
            if(numberOfTestsAdded > profile.testsPerDay){
                break;
            }
            var todaysTest = todaysCandidates[i];
            todaysTest.testDoc.previousTestDate = todaysTest.testDoc.lastTestDate;
            todaysTest.testDoc.lastTestDate = getTodaysDate();
            todaysTest.testDoc.testCompleted = false;
            updateTest(todaysTest.wordDoc.word, userId, spanishWordsDBConnection, spanishTestsDBConnection, todaysTest);
            todaysTests.push(todaysTest);
        }
        profile.lastTestDate = getTodaysDate();
        updateProfile(userId, profilesDBConnection, profile)
    }
    todaysTests.sort((a, b) =>
    (a.testDoc.testCompleted === b.testDoc.testCompleted
        ? Number(a.wordDoc.rank) - Number(b.wordDoc.rank)
        : a.testDoc.testCompleted ? 1 : -1)
    );
    return todaysTests;
}

export const getTest = async (word, userId, spanishWordsDBConnection, spanishTestsDBConnection) => {
    const spanishWordModel = spanishWordsDBConnection.model("Word", WordSchema);
    const spanishTestModel = spanishTestsDBConnection.model(userId + spanishTestingName, TestSchema);
    var wordDoc = await spanishWordModel.findOne({ word: word });
    var testDoc = await spanishTestModel.findOne({ word: word });
    const wordTestDoc = {
        wordDoc: wordDoc,
        testDoc: testDoc
    };
    return wordTestDoc;
}

export const updateTest = async (word, userId, spanishWordsDBConnection, spanishTestsDBConnection, data) => {
    const spanishWordModel = spanishWordsDBConnection.model("Word", WordSchema);
    const spanishTestModel = spanishTestsDBConnection.model(userId + spanishTestingName, TestSchema);

    const cleanNotes = sanitizeHtml(data.testDoc.userNotes || "", {
        allowedTags: [],
        allowedAttributes: {}
    });

    var wordDoc = await spanishWordModel.findOne({ word: word });
    const updatedTestDoc = await spanishTestModel.findOneAndUpdate(
        {
            'word': word
        },
        {
            $set: { 
                lastTestDate: data.testDoc.lastTestDate,
                previousTestDate: data.testDoc.previousTestDate,
                averageDaysBetweenTests: data.testDoc.averageDaysBetweenTests,
                numberOfTrials: data.testDoc.numberOfTrials,
                userNotes: cleanNotes,
                testCompleted: data.testDoc.testCompleted,
                // word and rank are immutable/key fields, so they aren't updated here.
            }
        },
        { 
            new: true // Return the updated document
        } 
    );

    if (!updatedTestDoc) { // Changed variable name for clarity
        return { status: 400, message: 'Test not found' }; // Return 400 status if the test is not found
    }
    
    return updatedTestDoc;
}

export const daysSince = (date) => {
    const last = new Date(date);
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((today - last) / msPerDay);
}
