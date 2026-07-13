import React, { Component } from 'react';
import { DefaultHeader } from '../../pages/DefaultHeader.jsx';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';

class TranslationSearchHtml extends Component {
  constructor(props) {
    super(props);

    this.wordsList = props.allSpanishWordsData || [];

    this.state = {
      containsWords: '',
      doesNotContainWords: '',
      posFilter: 'all',
      lemmaFilter: 'all',
      posOptions: ['all'],
      lemmaOptions: ['all'],
      sortColumn: 'Rank',
      sortDirection: 'asc',
    };

    this.searchInputRef = React.createRef();

    // Typeahead buffer for lemma select
    this.lemmaTypeBuffer = '';
    this.lastLemmaTypeTime = 0;
    this.typeTimeoutMs = 800;
    this._lemmaTypeTimeout = null;

    this.handleSort = this.handleSort.bind(this);
  }

  componentDidMount() {
    if (this.searchInputRef.current) {
      this.searchInputRef.current.focus();
    }

    // Build POS and lemma options
    const posSet = new Set();
    const lemmaSet = new Set();

    this.wordsList.forEach((item) => {
      (item.entries || []).forEach((entry) => {
        if (entry.pos) {
          posSet.add(entry.pos);
        }

        if (entry.lemma) {
          lemmaSet.add(entry.lemma);
        }
      });
    });

    const sortedPos = [
      'all',
      ...Array.from(posSet).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'variant' })
      ),
    ];

    const sortedLemmas = [
      'all',
      ...Array.from(lemmaSet).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'variant' })
      ),
    ];

    this.setState({
      posOptions: sortedPos,
      lemmaOptions: sortedLemmas,
    });
  }

  componentWillUnmount() {
    if (this._lemmaTypeTimeout) {
      clearTimeout(this._lemmaTypeTimeout);
    }
  }

  // ------------------------------
  // Strip accents
  // ------------------------------
  stripAccents = (str) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // ------------------------------
  // Sorting
  // ------------------------------
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

  getSortValue = (item, column) => {
    switch (column) {
      case 'Word':
        return this.stripAccents((item.word || '').toLowerCase());

      case 'Rank':
        return typeof item.rank === 'number'
          ? item.rank
          : Number.MAX_SAFE_INTEGER;

      case 'POS':
        return this.stripAccents((item.pos || '').toLowerCase());

      case 'Translation':
        return this.stripAccents((item.gloss || '').toLowerCase());

      default:
        return '';
    }
  };

  renderSortableHeader = (
    columnKey,
    displayTitleHtml,
    currentSortColumn,
    currentSortDirection
  ) => {
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
        <span
          dangerouslySetInnerHTML={{
            __html: displayTitleHtml,
          }}
        />

        <span className={`ml-1 ${iconColorClass}`}>
          {icon}
        </span>
      </th>
    );
  };

  // ------------------------------
  // Lemma select typeahead
  // ------------------------------
  handleLemmaTypeahead = (event) => {
    const key = event.key;

    // Only handle printable single-character keys
    if (!key || key.length !== 1) {
      return;
    }

    const now = Date.now();

    if (now - this.lastLemmaTypeTime > this.typeTimeoutMs) {
      this.lemmaTypeBuffer = '';
    }

    this.lastLemmaTypeTime = now;
    this.lemmaTypeBuffer += key;

    const bufferLower = this.lemmaTypeBuffer.toLowerCase();
    const options = this.state.lemmaOptions || [];

    let found = null;

    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];

      if (!option) {
        continue;
      }

      if (option.toLowerCase().startsWith(bufferLower)) {
        found = option;
        break;
      }
    }

    if (found) {
      event.preventDefault();

      this.setState({
        lemmaFilter: found,
      });
    } else if (this.lemmaTypeBuffer.length > 1) {
      // Try again using only the most recently typed character
      this.lemmaTypeBuffer = key;

      const lastCharacterLower = key.toLowerCase();

      for (let i = 0; i < options.length; i += 1) {
        const option = options[i];

        if (!option) {
          continue;
        }

        if (option.toLowerCase().startsWith(lastCharacterLower)) {
          event.preventDefault();

          this.setState({
            lemmaFilter: option,
          });

          break;
        }
      }
    }

    clearTimeout(this._lemmaTypeTimeout);

    this._lemmaTypeTimeout = setTimeout(() => {
      this.lemmaTypeBuffer = '';
      this.lastLemmaTypeTime = 0;
    }, this.typeTimeoutMs + 50);
  };

  // ------------------------------
  // Tokenizer and matching
  // ------------------------------
  tokenizeSearchInput = (text) => {
    if (!text || !text.trim()) {
      return [];
    }

    const quoteCount = (text.match(/"/g) || []).length;

    // Do not search until unmatched quotes are completed
    if (quoteCount % 2 !== 0) {
      return [];
    }

    const tokens = [];
    const regex = /"([^"]+)"|(\S+)/g;

    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        tokens.push({
          type: 'phrase',
          value: this.stripAccents(match[1].toLowerCase()),
        });
      } else if (match[2]) {
        tokens.push({
          type: 'word',
          value: this.stripAccents(match[2].toLowerCase()),
        });
      }
    }

    return tokens;
  };

  TranslationContains = (gloss, tokens) => {
    const text = this.stripAccents((gloss || '').toLowerCase());

    for (const token of tokens) {
      if (token.type === 'phrase') {
        if (!text.includes(token.value)) {
          return false;
        }
      } else {
        const escaped = token.value.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

        const regex = new RegExp(`\\b${escaped}\\b`, 'i');

        if (!regex.test(text)) {
          return false;
        }
      }
    }

    return true;
  };

  TranslationDoesNotContain = (gloss, tokens) => {
    const text = this.stripAccents((gloss || '').toLowerCase());

    for (const token of tokens) {
      if (token.type === 'phrase') {
        if (text.includes(token.value)) {
          return false;
        }
      } else {
        const escaped = token.value.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

        const regex = new RegExp(`\\b${escaped}\\b`, 'i');

        if (regex.test(text)) {
          return false;
        }
      }
    }

    return true;
  };

  // ------------------------------
  // Highlight matching text
  // ------------------------------
  highlightMatches = (gloss, tokens) => {
    if (!gloss) {
      return '';
    }

    const escapeHtml = (value) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const escapedGloss = escapeHtml(gloss);
    const strippedGloss = this.stripAccents(gloss).toLowerCase();
    const ranges = [];

    tokens.forEach((tokenRecord) => {
      const token = this.stripAccents(tokenRecord.value);

      if (!token) {
        return;
      }

      let index = strippedGloss.indexOf(token);

      while (index !== -1) {
        ranges.push([index, index + token.length]);
        index = strippedGloss.indexOf(token, index + 1);
      }
    });

    if (ranges.length === 0) {
      return escapedGloss;
    }

    // Merge overlapping ranges
    ranges.sort((a, b) => a[0] - b[0]);

    const mergedRanges = [];
    let [start, end] = ranges[0];

    for (let i = 1; i < ranges.length; i += 1) {
      const [rangeStart, rangeEnd] = ranges[i];

      if (rangeStart <= end) {
        end = Math.max(end, rangeEnd);
      } else {
        mergedRanges.push([start, end]);
        start = rangeStart;
        end = rangeEnd;
      }
    }

    mergedRanges.push([start, end]);

    let result = '';
    let cursor = 0;

    mergedRanges.forEach(([rangeStart, rangeEnd]) => {
      const escapedStart = escapeHtml(
        gloss.slice(0, rangeStart)
      ).length;

      const escapedEnd = escapeHtml(
        gloss.slice(0, rangeEnd)
      ).length;

      result += escapedGloss.slice(cursor, escapedStart);
      result += '<mark class="bg-yellow-300 rounded px-1">';
      result += escapedGloss.slice(escapedStart, escapedEnd);
      result += '</mark>';

      cursor = escapedEnd;
    });

    result += escapedGloss.slice(cursor);

    return result;
  };

  // ------------------------------
  // Filter and sort results
  // ------------------------------
  filteredList = () => {
    const {
      containsWords,
      doesNotContainWords,
      posFilter,
      lemmaFilter,
      sortColumn,
      sortDirection,
    } = this.state;

    const containsTokens =
      this.tokenizeSearchInput(containsWords);

    const notTokens =
      this.tokenizeSearchInput(doesNotContainWords);

    const results = [];

    this.wordsList.forEach((item) => {
      const entries = item.entries || [];

      entries.forEach((entry, entryIndex) => {
        const gloss = entry.gloss || '';

        if (
          !this.TranslationContains(
            gloss,
            containsTokens
          )
        ) {
          return;
        }

        if (
          !this.TranslationDoesNotContain(
            gloss,
            notTokens
          )
        ) {
          return;
        }

        if (
          posFilter !== 'all' &&
          entry.pos !== posFilter
        ) {
          return;
        }

        if (
          lemmaFilter !== 'all' &&
          entry.lemma !== lemmaFilter
        ) {
          return;
        }

        results.push({
          word: item.word,
          rank: item.rank,
          gloss,
          pos: entry.pos,
          lemma: entry.lemma,
          entryIndex,
        });
      });
    });

    const sortedResults = [...results].sort((a, b) => {
      const valueA = this.getSortValue(a, sortColumn);
      const valueB = this.getSortValue(b, sortColumn);

      let primaryComparison = 0;

      if (
        typeof valueA === 'string' &&
        typeof valueB === 'string'
      ) {
        primaryComparison = valueA.localeCompare(
          valueB,
          'es',
          { sensitivity: 'base' }
        );
      } else if (valueA > valueB) {
        primaryComparison = 1;
      } else if (valueA < valueB) {
        primaryComparison = -1;
      }

      if (primaryComparison !== 0) {
        return sortDirection === 'asc'
          ? primaryComparison
          : -primaryComparison;
      }

      // Secondary sort: Rank ascending
      const rankA =
        typeof a.rank === 'number'
          ? a.rank
          : Number.MAX_SAFE_INTEGER;

      const rankB =
        typeof b.rank === 'number'
          ? b.rank
          : Number.MAX_SAFE_INTEGER;

      if (rankA > rankB) {
        return 1;
      }

      if (rankA < rankB) {
        return -1;
      }

      // Third sort: Word ascending
      return this.stripAccents(
        (a.word || '').toLowerCase()
      ).localeCompare(
        this.stripAccents(
          (b.word || '').toLowerCase()
        ),
        'es',
        { sensitivity: 'base' }
      );
    });

    return (
      <div className="ml-[0.25in]">
        <table className="table-auto border border-gray-300 w-auto mb-4">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">
                &nbsp;
              </th>

              {this.renderSortableHeader(
                'Word',
                'Word',
                sortColumn,
                sortDirection
              )}

              {this.renderSortableHeader(
                'Rank',
                'Rank',
                sortColumn,
                sortDirection
              )}

              {this.renderSortableHeader(
                'POS',
                'POS',
                sortColumn,
                sortDirection
              )}

              {this.renderSortableHeader(
                'Translation',
                'Translation',
                sortColumn,
                sortDirection
              )}
            </tr>
          </thead>

          <tbody>
            {sortedResults.map((record, index) => (
              <tr
                key={`${record.word}-${record.entryIndex}-${index}`}
              >
                <td className="px-3 py-2 border border-gray-300">
                  <a
                    href={`/spanish/viewTest/${record.word}/ts`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    view
                  </a>
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  {record.word}
                </td>

                <td className="px-3 py-2 border border-gray-300 text-right">
                  {record.rank}
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  {record.pos}
                </td>

                <td
                  className="px-3 py-2 border border-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: this.highlightMatches(
                      record.gloss,
                      containsTokens
                    ),
                  }}
                />
              </tr>
            ))}

            {sortedResults.length === 0 && (
              <tr>
                <td
                  className="px-3 py-2 border border-gray-300"
                  colSpan="5"
                >
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ------------------------------
  // Reset filters
  // ------------------------------
  resetFilters = () => {
    this.setState({
      containsWords: '',
      doesNotContainWords: '',
      posFilter: 'all',
      lemmaFilter: 'all',
    });

    this.lemmaTypeBuffer = '';
    this.lastLemmaTypeTime = 0;

    if (this._lemmaTypeTimeout) {
      clearTimeout(this._lemmaTypeTimeout);
    }

    if (this.searchInputRef.current) {
      this.searchInputRef.current.focus();
    }
  };

  // ------------------------------
  // Search controls
  // ------------------------------
  renderSearchBox = () => (
    <div>
      <table>
        <tbody>
          <tr>
            <td className="pl-[0.5in] mb-4 text-right">
              <label className="text-sm font-medium mr-2">
                Contains the word(s):
              </label>
            </td>

            <td>
              <input
                type="text"
                ref={this.searchInputRef}
                className="w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={this.state.containsWords}
                onChange={(event) =>
                  this.setState({
                    containsWords:
                      event.target.value.slice(0, 50),
                  })
                }
              />
            </td>
          </tr>

          <tr>
            <td className="pl-[0.5in] mb-4 text-right">
              <label className="text-sm font-medium mr-2">
                Does not contain the&nbsp;&nbsp;
                <br />
                word(s):
              </label>
            </td>

            <td>
              <input
                type="text"
                className="w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={this.state.doesNotContainWords}
                onChange={(event) =>
                  this.setState({
                    doesNotContainWords:
                      event.target.value.slice(0, 50),
                  })
                }
              />
            </td>
          </tr>

          <tr>
            <td />

            <td>
              <div className="text-xs text-left m-[0.03125in]">
                Hint: Put phrases in double quotes, for
                example, &quot;(past participle)&quot;
              </div>
            </td>
          </tr>

          <tr>
            <td className="text-right">
              <label className="text-sm font-medium mr-2">
                Part of speech (POS):
              </label>
            </td>

            <td className="flex space-x-4 items-center">
              <select
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                value={this.state.posFilter}
                onChange={(event) =>
                  this.setState({
                    posFilter: event.target.value,
                  })
                }
              >
                {this.state.posOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">
                  Base:
                </label>

                <select
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  value={this.state.lemmaFilter}
                  onChange={(event) =>
                    this.setState({
                      lemmaFilter:
                        event.target.value,
                    })
                  }
                  onKeyDown={this.handleLemmaTypeahead}
                >
                  {this.state.lemmaOptions.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>
            </td>
          </tr>

          <tr>
            <td />

            <td className="mt-2">
              <button
                type="button"
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
                onClick={this.resetFilters}
              >
                Reset Filters
              </button>
            </td>
          </tr>

          <tr>
            <td
              colSpan="2"
              className="h-[0.25in]"
            />
          </tr>
        </tbody>
      </table>
    </div>
  );

  render() {
    return (
      <div>
        <DefaultHeader />

        <div className="mb-6">
          <h1 className="text-3xl font-bold ml-[0.75in]">
            Translation Search
          </h1>
        </div>

        {this.renderSearchBox()}
        {this.filteredList()}

        <DefaultFooter />
      </div>
    );
  }
}

export default TranslationSearchHtml;
