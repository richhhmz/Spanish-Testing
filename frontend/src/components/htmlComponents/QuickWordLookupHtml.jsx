import React, { Component } from 'react';
import { DefaultHeader } from '../../pages/DefaultHeader.jsx';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';

class QuickWordLookupHtml extends Component {
  constructor(props) {
    super(props);
    this.wordsList = props.allSpanishWordsData;
    this.state = { searchTerm: '', };
    this.searchInputRef = React.createRef();
  }

  componentDidMount() {
    // Focus the search box when the component mounts
    if (this.searchInputRef.current) {
      this.searchInputRef.current.focus();
    }
  }

stripAccents = (str) => {
  // Map ordinal indicators to normal letters
  const manualMap = str
    .replace(/ª/g, "a")
    .replace(/º/g, "o");

  // Strip accents normally
  return manualMap.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

  filteredList = () => {
    const filteredList = this.wordsList.filter(item => {
      const word = this.stripAccents(item.word.toLowerCase());
      const search = this.stripAccents(this.state.searchTerm.toLowerCase());
      return word.startsWith(search);
    });

    return (
      <div className="ml-[0.5in]">
        <table className="table-auto border border-gray-300 w-auto mb-4">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">&nbsp;</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Word</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">Rank</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item, index) => (
              <tr key={index}>
                <td className="px-3 py-2 border border-gray-300">
                  <a href={`/spanish/viewTest/${item.word}/qwl`} className="text-blue-600 hover:text-blue-800">view</a>
                </td>
                <td className="px-3 py-2 border border-gray-300">{item.word}</td>
                <td className="px-3 py-2 border border-gray-300">{item.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  renderSearchBox = () => {
    return (
      <div className="ml-[0.5in] mb-4 flex items-center">
        <label htmlFor="wordSearch" className="text-sm font-medium text-gray-700 mr-2">Search Word:</label>
        <input
          type="text"
          id="wordSearch"
           ref={this.searchInputRef}
          className="w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="e.g. que"
          value={this.state.searchTerm}
          onChange={(e) => this.setState({ searchTerm: e.target.value })}
        />
      </div>
    );
  }

  render() {
    return (
      <div>
        <DefaultHeader />
        <div className="mb-6">
          <h1 className="text-3xl font-bold ml-[0.75in]">Quick Word Lookup</h1>
        </div>
        {this.renderSearchBox()}
        {this.filteredList()}
        <DefaultFooter />
      </div>
    );
  }
}

export default QuickWordLookupHtml;