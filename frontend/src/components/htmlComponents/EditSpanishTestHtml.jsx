import React, { Component } from 'react';
import axios from '../../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { defaultPreviousTestDate } from '../../globals.js';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';

class EditSpanishTestHtml extends Component {
  constructor(props) {
    super(props);

    this.state = {
      editSpanishTestData: props.editSpanishTestData,
      source: props.source,
      word: props.word,
    };
  }

  getTodayDateString = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  getPosOptions = () => {
    return [
      'abbreviation',
      'adjective',
      'adverb',
      'article',
      'character',
      'conjunction',
      'contraction',
      'interjection',
      'noun',
      'number',
      'preposition',
      'pronoun',
      'verb',
    ];
  };

  posShowsNumber = (pos) => {
    return [
      'adjective',
      'article',
      'noun',
      'pronoun',
      'contraction',
      'verb',
    ].includes(pos);
  };

  posShowsGender = (pos) => {
    return [
      'adjective',
      'article',
      'noun',
      'pronoun',
    ].includes(pos);
  };

  posShowsMood = (pos) => {
    return pos === 'verb';
  };

  posShowsTense = (pos) => {
    return pos === 'verb';
  };

  posShowsPerson = (pos) => {
    return pos === 'verb';
  };

  posShowsBase = (pos) => {
    return pos === 'verb';
  };

  createEmptyUse = () => {
    return {
      pos: '',
      gloss: '',
      number: '',
      gender: '',
      mood: '',
      tense: '',
      person: '',
      lemma: '',
      example: '',
      translation: '',
    };
  };

  /* ─────────────────────────
     ENTRY FIELD HANDLER
     ───────────────────────── */
  handleEntryChange = (index, field, value) => {
    this.setState(prev => {
      const entries = [...prev.editSpanishTestData.wordDoc.entries];
      const updatedEntry = { ...entries[index], [field]: value };

      if (field === 'pos') {
        if (!this.posShowsNumber(value)) {
          updatedEntry.number = '';
        }
        if (!this.posShowsGender(value)) {
          updatedEntry.gender = '';
        }
        if (!this.posShowsMood(value)) {
          updatedEntry.mood = '';
        }
        if (!this.posShowsTense(value)) {
          updatedEntry.tense = '';
        }
        if (!this.posShowsPerson(value)) {
          updatedEntry.person = '';
        }
        if (!this.posShowsBase(value)) {
          updatedEntry.lemma = '';
        }
      }

      entries[index] = updatedEntry;

      return {
        editSpanishTestData: {
          ...prev.editSpanishTestData,
          wordDoc: {
            ...prev.editSpanishTestData.wordDoc,
            entries
          }
        }
      };
    });
  };

  addUse = () => {
    this.setState(prev => {
      const entries = [...prev.editSpanishTestData.wordDoc.entries, this.createEmptyUse()];

      return {
        editSpanishTestData: {
          ...prev.editSpanishTestData,
          wordDoc: {
            ...prev.editSpanishTestData.wordDoc,
            entries
          }
        }
      };
    });
  };

  normalizeEntryForSave = (entry) => {
    const normalizedEntry = {
      ...entry,
      pos: entry.pos ? entry.pos.trim() : '',
      gloss: entry.gloss ? entry.gloss.trim() : '',
      example: entry.example ? entry.example.trim() : '',
      translation: entry.translation ? entry.translation.trim() : '',
      lemma: entry.lemma ? entry.lemma.trim() : '',
    };

    if (!this.posShowsNumber(normalizedEntry.pos)) {
      normalizedEntry.number = null;
    } else {
      normalizedEntry.number = normalizedEntry.number ? normalizedEntry.number : null;
    }

    if (!this.posShowsGender(normalizedEntry.pos)) {
      normalizedEntry.gender = null;
    } else if (normalizedEntry.gender === 'masculine') {
      normalizedEntry.gender = 'm';
    } else if (normalizedEntry.gender === 'feminine') {
      normalizedEntry.gender = 'f';
    } else {
      normalizedEntry.gender = null;
    }

    if (!this.posShowsMood(normalizedEntry.pos)) {
      normalizedEntry.mood = null;
    } else {
      normalizedEntry.mood = normalizedEntry.mood ? normalizedEntry.mood : null;
    }

    if (!this.posShowsTense(normalizedEntry.pos)) {
      normalizedEntry.tense = null;
    } else {
      normalizedEntry.tense = normalizedEntry.tense ? normalizedEntry.tense : null;
    }

    if (!this.posShowsPerson(normalizedEntry.pos)) {
      normalizedEntry.person = null;
    } else {
      normalizedEntry.person = normalizedEntry.person ? normalizedEntry.person : null;
    }

    if (!this.posShowsBase(normalizedEntry.pos)) {
      normalizedEntry.lemma = null;
    } else if (!normalizedEntry.lemma) {
      normalizedEntry.lemma = null;
    }

    return normalizedEntry;
  };

  validateEntries = () => {
    const { editSpanishTestData } = this.state;
    const entries = editSpanishTestData.wordDoc.entries || [];

    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const useNumber = i + 1;

      if (!entry.pos || !entry.pos.trim()) {
        this.props.enqueueSnackbar(
          `Use ${useNumber}: POS is required.`,
          { variant: 'error' }
        );
        return false;
      }

      if (!entry.gloss || !entry.gloss.trim()) {
        this.props.enqueueSnackbar(
          `Use ${useNumber}: Meaning is required.`,
          { variant: 'error' }
        );
        return false;
      }

      if (!entry.example || !entry.example.trim()) {
        this.props.enqueueSnackbar(
          `Use ${useNumber}: Example is required.`,
          { variant: 'error' }
        );
        return false;
      }

      if (!entry.translation || !entry.translation.trim()) {
        this.props.enqueueSnackbar(
          `Use ${useNumber}: Translation is required.`,
          { variant: 'error' }
        );
        return false;
      }
    }

    return true;
  };

  /* ─────────────────────────
     SAVE
     ───────────────────────── */
  put = async () => {
    const { editSpanishTestData } = this.state;
    const wordToUpdate = editSpanishTestData.wordDoc.word;

    try {
      await axios.put(
        `/api/spanish/updateWord/${wordToUpdate}`,
        editSpanishTestData
      );

      this.props.enqueueSnackbar(
        'Test updated successfully!',
        { variant: 'success' }
      );

      setTimeout(() => {
        window.location.href =
          `/spanish/viewTest/${this.state.word}/${this.state.source}`;
      }, 1200);
    } catch (err) {
      console.error(err);
      this.props.enqueueSnackbar(
        'Save failed.',
        { variant: 'error' }
      );
    }
  };

  save = () => {
    if (!this.validateEntries()) {
      return;
    }

    this.setState(prev => {
      const normalizedEntries = (prev.editSpanishTestData.wordDoc.entries || []).map(entry =>
        this.normalizeEntryForSave(entry)
      );

      return {
        editSpanishTestData: {
          ...prev.editSpanishTestData,
          wordDoc: {
            ...prev.editSpanishTestData.wordDoc,
            entries: normalizedEntries
          },
          testDoc: {
            ...prev.editSpanishTestData.testDoc
          }
        }
      };
    }, this.put);
  };

  cancel = () => {
    this.props.enqueueSnackbar('Update cancelled.', { variant: 'info' });
    setTimeout(() => {
      window.location.href =
        `/spanish/viewTest/${this.state.word}/${this.state.source}`;
    }, 1000);
  };

  daysSince = (date) => {
    if (!date) return '';
    return Math.floor(
      (new Date() - new Date(date)) / (1000 * 60 * 60 * 24)
    );
  };

  render() {
    const { editSpanishTestData } = this.state;
    const { wordDoc, testDoc } = editSpanishTestData;
    const posOptions = this.getPosOptions();

    return (
      <div className="overflow-x-auto p-4">
        <div className="text-3xl font-bold mb-6 text-blue-700 ml-[0.75in]">
          Edit Spanish Test for {wordDoc.word}
        </div>

        <table className="table-auto border border-gray-300 mb-6">
          <tbody>
            <tr>
              <td className="bg-gray-200 px-3 py-2 font-semibold">Rank</td>
              <td className="px-3 py-2">{wordDoc.rank}</td>
            </tr>
            <tr>
              <td className="bg-gray-200 px-3 py-2 font-semibold">Trials</td>
              <td className="px-3 py-2">{testDoc.numberOfTrials}</td>
            </tr>

            {wordDoc.entries.map((entry, i) => (
              <React.Fragment key={i}>
                <tr>
                  <td
                    colSpan="2"
                    className="bg-gray-200 px-3 py-2 font-semibold text-center"
                  >
                    Use {i + 1}
                  </td>
                </tr>

                <tr>
                  <td className="bg-gray-200 px-3 py-2 font-semibold">POS</td>
                  <td className="px-3 py-1">
                    <select
                      className="w-[4.5in] border p-2 bg-white"
                      value={entry.pos || ''}
                      onChange={(e) =>
                        this.handleEntryChange(i, 'pos', e.target.value)
                      }
                    >
                      <option value=""></option>
                      {posOptions.map((posOption) => (
                        <option key={posOption} value={posOption}>
                          {posOption}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>

                <tr>
                  <td className="bg-gray-200 px-3 py-2 font-semibold">Meaning</td>
                  <td className="px-3 py-1">
                    <textarea
                      rows={2}
                      className="w-[4.5in] border p-2"
                      value={entry.gloss || ''}
                      onChange={(e) =>
                        this.handleEntryChange(i, 'gloss', e.target.value)
                      }
                    />
                  </td>
                </tr>

                {this.posShowsNumber(entry.pos) && (
                  <tr>
                    <td className="bg-gray-200 px-3 py-2 font-semibold">Number</td>
                    <td className="px-3 py-1">
                      <select
                        className="w-[4.5in] border p-2 bg-white"
                        value={entry.number || ''}
                        onChange={(e) =>
                          this.handleEntryChange(i, 'number', e.target.value)
                        }
                      >
                        <option value=""></option>
                        <option value="plural">plural</option>
                        <option value="singular">singular</option>
                      </select>
                    </td>
                  </tr>
                )}

                {this.posShowsGender(entry.pos) && (
                  <tr>
                    <td className="bg-gray-200 px-3 py-2 font-semibold">Gender</td>
                    <td className="px-3 py-1">
                      <select
                        className="w-[4.5in] border p-2 bg-white"
                        value={
                          entry.gender === 'm'
                            ? 'masculine'
                            : entry.gender === 'f'
                              ? 'feminine'
                              : entry.gender || ''
                        }
                        onChange={(e) =>
                          this.handleEntryChange(i, 'gender', e.target.value)
                        }
                      >
                        <option value=""></option>
                        <option value="masculine">masculine</option>
                        <option value="feminine">feminine</option>
                      </select>
                    </td>
                  </tr>
                )}

                {this.posShowsMood(entry.pos) && (
                  <tr>
                    <td className="bg-gray-200 px-3 py-2 font-semibold">Mood</td>
                    <td className="px-3 py-1">
                      <select
                        className="w-[4.5in] border p-2 bg-white"
                        value={entry.mood || ''}
                        onChange={(e) =>
                          this.handleEntryChange(i, 'mood', e.target.value)
                        }
                      >
                        <option value=""></option>
                        <option value="conditional">conditional</option>
                        <option value="imperative">imperative</option>
                        <option value="indicative">indicative</option>
                        <option value="subjunctive">subjunctive</option>
                      </select>
                    </td>
                  </tr>
                )}

                {this.posShowsTense(entry.pos) && (
                  <tr>
                    <td className="bg-gray-200 px-3 py-2 font-semibold">Tense</td>
                    <td className="px-3 py-1">
                      <select
                        className="w-[4.5in] border p-2 bg-white"
                        value={entry.tense || ''}
                        onChange={(e) =>
                          this.handleEntryChange(i, 'tense', e.target.value)
                        }
                      >
                        <option value=""></option>
                        <option value="future">future</option>
                        <option value="imperfect">imperfect</option>
                        <option value="present">present</option>
                        <option value="preterite">preterite</option>
                      </select>
                    </td>
                  </tr>
                )}

                {this.posShowsPerson(entry.pos) && (
                  <tr>
                    <td className="bg-gray-200 px-3 py-2 font-semibold">Person</td>
                    <td className="px-3 py-1">
                      <select
                        className="w-[4.5in] border p-2 bg-white"
                        value={entry.person || ''}
                        onChange={(e) =>
                          this.handleEntryChange(i, 'person', e.target.value)
                        }
                      >
                        <option value=""></option>
                        <option value="1st">1st</option>
                        <option value="2nd">2nd</option>
                        <option value="3rd">3rd</option>
                      </select>
                    </td>
                  </tr>
                )}

                {this.posShowsBase(entry.pos) && (
                  <tr>
                    <td className="bg-gray-200 px-3 py-2 font-semibold">Base</td>
                    <td className="px-3 py-1">
                      <textarea
                        rows={1}
                        className="w-[4.5in] border p-2"
                        value={entry.lemma || ''}
                        onChange={(e) =>
                          this.handleEntryChange(i, 'lemma', e.target.value)
                        }
                      />
                    </td>
                  </tr>
                )}

                <tr>
                  <td className="bg-gray-200 px-3 py-2 font-semibold">Example</td>
                  <td className="px-3 py-1">
                    <textarea
                      rows={1}
                      className="w-[4.5in] border p-2"
                      value={entry.example || ''}
                      onChange={(e) =>
                        this.handleEntryChange(i, 'example', e.target.value)
                      }
                    />
                  </td>
                </tr>

                <tr>
                  <td className="bg-gray-200 px-3 py-2 font-semibold">Translation</td>
                  <td className="px-3 py-1">
                    <textarea
                      rows={1}
                      className="w-[4.5in] border p-2"
                      value={entry.translation || ''}
                      onChange={(e) =>
                        this.handleEntryChange(i, 'translation', e.target.value)
                      }
                    />
                  </td>
                </tr>
              </React.Fragment>
            ))}

            <tr>
              <td colSpan="2" className="px-3 py-3 text-center">
                <button
                  onClick={this.addUse}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Add a use
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="ml-[1.5in] flex gap-4">
          <button
            onClick={this.save}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Save
          </button>
          <button
            onClick={this.cancel}
            className="px-4 py-2 border border-blue-500 text-blue-500 rounded"
          >
            Cancel
          </button>
        </div>

        <DefaultFooter />
      </div>
    );
  }
}

function EditSpanishTestHtmlWrapper(props) {
  const { enqueueSnackbar } = useSnackbar();
  return <EditSpanishTestHtml {...props} enqueueSnackbar={enqueueSnackbar} />;
}

export default EditSpanishTestHtmlWrapper;
