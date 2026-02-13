import React, { Component } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';
import axios from '../../api/AxiosClient';
import { useSnackbar } from 'notistack';
import { getUrlForCode } from '../../utils/Util.js';
import { defaultPreviousTestDate } from '../../globals.js';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';

class ViewSpanishTestHtml extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viewSpanishTestData: props.viewSpanishTestData,
      source: props.source,
      word: props.word,
      rank: props.viewSpanishTestData.rank,
      isAdmin: false, // But we'll get the actual value from the backend in componentDidMount.
      showTranslation: [],
    };

    this.toggleTranslation = this.toggleTranslation.bind(this);
  }

  // Inside ViewSpanishTestHtml class:
  toggleTranslation = (index) => {
    this.setState(prevState => {
      const newShowTranslation = [...prevState.showTranslation];
      // Toggle the boolean value for the specific index
      newShowTranslation[index] = !newShowTranslation[index];
      return { showTranslation: newShowTranslation };
    });
  };

  async componentDidMount() {
    try {
      const response = await axios.get('/api/spanish/getProfile');
      const isAdmin = response.data.data.isAdmin;
      this.setState({ isAdmin });
    } catch (error) {
      console.error("Error fetching admin status:", error);
    }
  }

  getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  closeWindow = () => {
    window.close();
  };

  put = async () => {
    const { viewSpanishTestData } = this.state;
    const wordToUpdate = viewSpanishTestData.wordDoc.word;

    try {
      const response = await axios.put(
        `/api/spanish/updateTest/${wordToUpdate}`,
        viewSpanishTestData
      );

      this.props.enqueueSnackbar(
        "Test updated successfully!",
        { variant: "success" }
      );

      setTimeout(() => {
        window.location.href = getUrlForCode(this.state.source);
      }, 1500);
    } catch (err) {
      console.error("Save failed:", err);
      this.props.enqueueSnackbar(
        "Save failed. Please try again.",
        { variant: "error" }
      );
    }
  };

  save = () => {
    const { viewSpanishTestData } = this.state;

    this.setState((prevState) => {
      const todayDate = this.getTodayDateString(); // Get today's date

      return {
        viewSpanishTestData: {
          ...prevState.viewSpanishTestData,
          testDoc: {
            ...prevState.viewSpanishTestData.testDoc,
            testCompleted: true,
            lastTestDate: todayDate,
            numberOfTrials: prevState.viewSpanishTestData.testDoc.numberOfTrials + 1,
          },
        },
      };
    }, this.put);
  };

  cancel = () => {
    this.props.enqueueSnackbar("Update cancelled.", { variant: "info" });

    setTimeout(() => {
      window.location.href = getUrlForCode(this.state.source);
    }, 1500);
  };

  convertGender = (gender) => {
    if (gender == 'm') {
      return 'masculine';
    } else if (gender == 'f') {
      return 'feminine';
    } else if (gender == 'n') {
      return 'neuter';
    }
    return '';
  }

  setUserNotes = (notes) => {
    this.setState((prevState) => ({
      viewSpanishTestData: {
        ...prevState.viewSpanishTestData,
        testDoc: {
          ...prevState.viewSpanishTestData.testDoc,
          userNotes: notes,
        },
      },
    }));
  };
  plusScore = () => {
    const { viewSpanishTestData } = this.state;
    const newTestDoc = { ...viewSpanishTestData.testDoc };
    var newValue = newTestDoc.averageDaysBetweenTests * 2.0;
    newValue = Math.ceil(newValue * 100) / 100;
    if (newValue >= 1000) newValue = 1000;
    newTestDoc.averageDaysBetweenTests = newValue;
    this.setState({
      viewSpanishTestData: {
        ...viewSpanishTestData, // Copy all other properties of viewSpanishTestData
        testDoc: newTestDoc, // Use the updated testDoc
      },
    });
  };

  minusScore = () => {
    const { viewSpanishTestData } = this.state;
    const newTestDoc = { ...viewSpanishTestData.testDoc };
    var newValue = newTestDoc.averageDaysBetweenTests / 2.0;
    if (newValue < 1) newValue = 1;
    newValue = Math.ceil(newValue * 100) / 100;
    newTestDoc.averageDaysBetweenTests = newValue;
    this.setState({
      viewSpanishTestData: {
        ...viewSpanishTestData,
        testDoc: newTestDoc,
      },
    });
  }

  getLookupLemmaUrl = (word) => {
    return `/spanish/viewTest/${word}/lma`;
  }

  getEditTestUrl = (word, source) => {
    return `/spanish/editTest/${word}/${source}`;
  }

  daysSince = (dateString) => {
    if (!dateString) return null;
    const last = new Date(dateString);
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((today - last) / msPerDay);
  }

  render() {
    const { isAdmin, user, word, viewSpanishTestData } = this.state;
    return (
      <div className="overflow-x-auto p-4">
        {this.props.source != 'lma' && (
          <div className="text-3xl font-bold mb-6 text-left text-blue-700 ml-[0.75in]">
            {`Spanish Test for ${this.props.word}`}
          </div>
        )}
        {this.props.source === 'lma' && this.props.viewSpanishTestData.wordDoc === null && (
          <div className="text-xl font-bold mb-4 text-left text-blue-700 ml-[1.0in]">
            {`The base word ${this.props.word} is not in the top 10K list`}
          </div>
        )}
        {this.props.source === 'lma' && this.props.viewSpanishTestData.wordDoc !== null && (
          <div className="text-xl font-bold mb-4 text-left text-blue-700 ml-[1.0in]">
            Base Word Definition
          </div>
        )}
        {this.props.viewSpanishTestData.wordDoc != null && (
          <div>
            <table className="table-auto border border-gray-300 w-auto mb-4">
              <tbody>
                <tr><td className="px-3 py-2 bg-gray-200 border border-gray-300" colSpan="2" /></tr>
                <tr>
                  <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Spanish Word</td>
                  <td className="px-3 py-2 border border-gray-300">{viewSpanishTestData.wordDoc.word}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Rank</td>
                  <td className="px-3 py-2 border border-gray-300">{viewSpanishTestData.wordDoc.rank}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Number of<br />Trials</td>
                  <td className="px-3 py-2 border border-gray-300">{viewSpanishTestData.testDoc.numberOfTrials}</td>
                </tr>
                {viewSpanishTestData.testDoc.previousTestDate !== defaultPreviousTestDate && (
                  <tr>
                    <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Days Since<br />Last Test</td>
                    <td className="px-3 py-2 border border-gray-300">{this.daysSince(viewSpanishTestData.testDoc.previousTestDate)}</td>
                  </tr>
                )}
                {this.state.source == 'tst' && (
                  <tr>
                    <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                      Completed
                    </td>
                    <td className="px-3 py-2 border border-gray-300">
                      {viewSpanishTestData.testDoc.testCompleted ? "yes" : "no"}
                    </td>
                  </tr>
                )}
                {viewSpanishTestData.wordDoc.entries.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold text-center" colSpan="2">
                        Use {index + 1}
                      </td>
                    </tr>
                    {item.lemma && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Base</td>
                        <td className="px-3 py-2 border border-gray-300">
                          <a href={this.getLookupLemmaUrl(item.lemma)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">{item.lemma}</a>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Type</td>
                      <td className="px-3 py-2 border border-gray-300">{item.pos}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Meaning</td>
                      <td className="px-3 py-2 border border-gray-300 whitespace-normal break-words w-[4.0in]">{item.gloss}</td>
                    </tr>
                    {item.voseo && item.voseo === true &&(
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Voseo</td>
                        <td className="px-3 py-2 border border-gray-300">yes</td>
                      </tr>
                    )}
                    {item.clitics && item.clitics.length === 1 && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Clitic</td>
                        <td className="px-3 py-2 border border-gray-300">{item.clitics}</td>
                      </tr>
                    )}
                    {item.clitics.length > 1 && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Clitics</td>
                        <td className="px-3 py-2 border border-gray-300">{item.clitics}</td>
                      </tr>
                    )}
                    {item.mood && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Mood</td>
                        <td className="px-3 py-2 border border-gray-300">{item.mood}</td>
                      </tr>
                    )}
                    {item.tense && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Tense</td>
                        <td className="px-3 py-2 border border-gray-300">{item.tense}</td>
                      </tr>
                    )}
                    {item.person && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Person</td>
                        <td className="px-3 py-2 border border-gray-300">{item.person}</td>
                      </tr>
                    )}
                    {item.number && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Number</td>
                        <td className="px-3 py-2 border border-gray-300">{item.number}</td>
                      </tr>
                    )}
                    {item.gender && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Gender</td>
                        <td className="px-3 py-2 border border-gray-300">{this.convertGender(item.gender)}</td>
                      </tr>
                    )}
                    {item.example && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Example</td>
                        <td className="px-3 py-2 border border-gray-300 w-96">{item.example}</td>
                      </tr>
                    )}
                    {item.translation && (
                      <tr>
                        <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Translation</td>
                        <td className="px-3 py-2 border border-gray-300 w-96">
                          {this.state.showTranslation[index] ? item.translation : (
                            <button onClick={() => this.toggleTranslation(index)} className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none">Show</button>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                <tr><td className="px-3 py-2 bg-gray-200 border border-gray-300" colSpan="2" /></tr>
                </tbody>
            </table>

            {this.props.source != 'lma' && (
              <table className="table-auto border border-gray-300 w-auto mb-4 ml-[0.6in]">
                <tbody>
                  <tr>
                    <td className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Average Days Between Tests</td>
                    <td className="px-3 py-2 border border-gray-300 flex items-center justify-center">{viewSpanishTestData.testDoc.averageDaysBetweenTests.toFixed(2)}</td>
                    <td className="px-3 py-2 border border-gray-300">
                      <button
                        className="bg-blue-500 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline flex items-center justify-center disabled:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={this.plusScore}
                        disabled={viewSpanishTestData.testDoc.averageDaysBetweenTests >= 1000}>
                        <FaPlus className="h-3 w-2" />
                      </button>
                    </td>
                    <td className="px-3 py-2 border border-gray-300">
                      <button
                        className="bg-red-500 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline flex items-center justify-center disabled:bg-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={this.minusScore}
                        disabled={viewSpanishTestData.testDoc.averageDaysBetweenTests <= 1}>
                        <FaMinus className="h-3 w-2" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
            {this.props.source != 'lma' && (
              <form>
                <div className="ml-[1.5in] flex space-x-4">
                  <button
                    type="button"
                    onClick={this.save}
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={this.cancel}
                    className="mb-4 px-4 py-2 bg-white text-blue-500 border border-blue-500 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {this.props.source === 'lma' && (
              <div className="ml-[1in]">
                <button
                  type="button"
                  onClick={this.closeWindow}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Close Window
                </button>
              </div>
            )}

            {this.state.isAdmin && (
              <div className="mt-4 text-center">
                <a
                  href={this.getEditTestUrl(viewSpanishTestData.wordDoc.word, this.state.source)}
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-700"
                >
                  Edit Test
                </a>
              </div>
            )}
          </div>
        )}
        <DefaultFooter />
      </div>
    );
  }
}

function ViewSpanishTestHtmlWrapper(props) {
  const { enqueueSnackbar } = useSnackbar();
  return <ViewSpanishTestHtml {...props} enqueueSnackbar={enqueueSnackbar} />;
}

export default ViewSpanishTestHtmlWrapper;
