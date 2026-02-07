import React, { Component } from 'react';
import { DefaultHeader } from '../../pages/DefaultHeader.jsx';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';

class TodaysSpanishTestsHtml extends Component {
  constructor(props) {
    super(props);
    this.testList = props.todaysTestsData;
    this.currentDateKey = new Date().toDateString();
  }

  componentDidMount() {
    this.dateCheckInterval = setInterval(() => {
      const todayKey = new Date().toDateString();
      if (todayKey !== this.currentDateKey) {
        window.location.reload();
      }
    }, 60 * 1000); // check once per minute
  }

  componentWillUnmount() {
    clearInterval(this.dateCheckInterval);
  }

  getFormattedDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  }

  dailyTestWords = () => {
    var testArray = [];
    for (var i = 0; i < this.testList.length; i++) {
      testArray.push(this.testList[i]);
    }

    return (
      <div className="mb-6 ml-[0.35in]">
        <table className="table-auto border border-gray-300 w-auto mb-4">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">&nbsp;</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Word</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Rank</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Completed</th>
            </tr>
          </thead>
          <tbody>
            {testArray.map((item, index) => (
              <tr key={index}>
                <td>
                  <a href={`/spanish/viewTest/${item.wordDoc.word}/tst`} className="text-blue-600 hover:text-blue-800 px-3 py-2 border border-gray-300">
                    view
                  </a>
                </td>
                <td className="px-3 py-2 border border-gray-300">{item.wordDoc.word}</td>
                <td className="px-3 py-2 border border-gray-300">{item.wordDoc.rank}</td>
                <td className="px-3 py-2 border border-gray-300 text-center">{item.testDoc.testCompleted ? "yes" : "no"}</td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  render() {
    const dateString = this.getFormattedDate();
    return (
      <div>
        <DefaultHeader />
        <div className="mb-6 ml-[0.3in]">
          <h1 className="text-2xl font-bold">Daily Spanish Learning List<br/>&nbsp;&nbsp;for {dateString}</h1>
        </div>

        {this.dailyTestWords()}
        <DefaultFooter />
        
      </div>
    );
  }
}

export default TodaysSpanishTestsHtml;
