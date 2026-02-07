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

  /* ─────────────────────────
     ENTRY FIELD HANDLER
     ───────────────────────── */
  handleEntryChange = (index, field, value) => {
    this.setState(prev => {
      const entries = [...prev.editSpanishTestData.wordDoc.entries];
      entries[index] = { ...entries[index], [field]: value };

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
    this.setState(prev => ({
      editSpanishTestData: {
        ...prev.editSpanishTestData,
        testDoc: {
          ...prev.editSpanishTestData.testDoc
        }
      }
    }), this.put);
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
                  <td colSpan="2"
                    className="bg-gray-200 px-3 py-2 font-semibold text-center">
                    Use {i + 1}
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
