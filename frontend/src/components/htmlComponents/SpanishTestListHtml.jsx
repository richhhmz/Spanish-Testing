import React, { Component } from 'react';
import { defaultLastTestDate } from '../../globals.js';
import { DefaultHeader } from '../../pages/DefaultHeader.jsx';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';

class SpanishTestListHtml extends Component {
  constructor(props) {
    super(props);
    this.testList = props.allSpanishTestsData;
    this.state = {
      searchTerm: '',
      sortColumn: 'Word',
      sortDirection: 'asc',
    };
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.searchInputRef = React.createRef();
  }

  componentDidMount() {
    if (this.searchInputRef.current) {
      this.searchInputRef.current.focus();
    }
  }

  handleSearchChange(event) {
    this.setState({ searchTerm: event.target.value });
  }

  handleSort(column) {
    const { sortColumn, sortDirection } = this.state;
    let newDirection = 'asc';

    if (sortColumn === column) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }

    this.setState({
      sortColumn: column,
      sortDirection: newDirection,
    });
  }

  stripAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  getSortValue(item, column) {
    switch (column) {
      case 'Word':
        return this.stripAccents(item.wordDoc.word.toLowerCase());
      case 'Rank':
        return item.wordDoc.rank;
      case 'Average Days Between Tests':
        return item.testDoc.averageDaysBetweenTests;
      case 'Number of Trials':
        return item.testDoc.numberOfTrials;
      case 'Last Test Date':
        return this.daysSince(item.testDoc.lastTestDate || defaultLastTestDate);
      default:
        return 0;
    }
  }

  daysSince = (dateString) => {
    if (!dateString) return null;
    const last = new Date(dateString);
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((today - last) / msPerDay);
  };

  testsList = () => {
    const { searchTerm, sortColumn, sortDirection } = this.state;

    const filteredList = this.testList.filter(item => {
      const word = this.stripAccents(item.wordDoc.word.toLowerCase());
      const search = this.stripAccents(searchTerm.toLowerCase());
      return word.startsWith(search);
    });

    const sortedList = [...filteredList].sort((a, b) => {
      const valueA = this.getSortValue(a, sortColumn);
      const valueB = this.getSortValue(b, sortColumn);

      let primary = 0;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        primary = valueA.localeCompare(valueB);
      } else {
        if (valueA > valueB) primary = 1;
        else if (valueA < valueB) primary = -1;
      }

      // Secondary sort: Rank ascending always
      if (primary === 0) {
        const rankA = a.wordDoc.rank;
        const rankB = b.wordDoc.rank;
        if (rankA > rankB) return 1;
        if (rankA < rankB) return -1;
        return 0;
      }

      return sortDirection === 'asc' ? primary : -primary;
    });

    return (
      <div className="ml-[0.5in]">
        <table className="table-auto border border-gray-300 w-auto mb-4">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">&nbsp;</th>
              {this.renderSortableHeader('Word', 'Word', sortColumn, sortDirection)}
              {this.renderSortableHeader('Rank', 'Rank', sortColumn, sortDirection)}
              {this.renderSortableHeader('Number of Trials', 'Number<br/>of Trials', sortColumn, sortDirection)}
              {this.renderSortableHeader(
                'Average Days Between Tests',
                'Average Days<br />Between Tests',
                sortColumn,
                sortDirection
              )}
              {this.renderSortableHeader('Last Test Date', 'Days Since<br />Last Test', sortColumn, sortDirection)}
            </tr>
          </thead>
          <tbody>
            {sortedList.map((item, index) => (
              <tr key={index}>
                <td className="px-3 py-2 border border-gray-300">
                  <a
                    href={`/spanish/viewTest/${item.wordDoc.word}/ast`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    view
                  </a>
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {item.wordDoc.word}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right">
                  {item.wordDoc.rank}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right">
                  {item.testDoc.numberOfTrials}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right">
                  {typeof item.testDoc.averageDaysBetweenTests === 'number'
                    ? item.testDoc.averageDaysBetweenTests.toFixed(2)
                    : ''}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right">
                  {item.testDoc.lastTestDate === defaultLastTestDate
                    ? ''
                    : this.daysSince(item.testDoc.lastTestDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  renderSortableHeader = (columnKey, displayTitleHtml, currentSortColumn, currentSortDirection) => {
    let icon = '↕';
    let iconColorClass = 'text-gray-400';

    if (currentSortColumn === columnKey) {
      icon = currentSortDirection === 'asc' ? '▲' : '▼';
      iconColorClass = 'text-blue-600';
    }

    return (
      <th
        key={columnKey}
        className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold cursor-pointer select-none whitespace-nowrap"
        onClick={() => this.handleSort(columnKey)}
      >
        <span dangerouslySetInnerHTML={{ __html: displayTitleHtml }} />
        <span className={`ml-1 ${iconColorClass}`}>
          {icon}
        </span>
      </th>
    );
  };

  renderSearchBox = () => {
    return (
      <div className="ml-[0.5in] mb-4 flex items-center">
        <label htmlFor="wordSearch" className="text-sm font-medium text-gray-700 mr-2">
          Search Word:
        </label>
        <input
          type="text"
          id="wordSearch"
          ref={this.searchInputRef}
          className="w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="e.g. que"
          value={this.state.searchTerm}
          onChange={this.handleSearchChange}
        />
      </div>
    );
  };

  render() {
    return (
      <div>
        <DefaultHeader />

        <div className="mb-6">
          <h1 className="text-3xl font-bold ml-[1.75in]">
            List of All Tests
          </h1>
        </div>

        {this.renderSearchBox()}
        {this.testsList()}

        <DefaultFooter />
      </div>
    );
  }
}

export default SpanishTestListHtml;
