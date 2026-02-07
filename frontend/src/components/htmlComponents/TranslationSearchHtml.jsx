import React, { Component } from 'react';
import { DefaultHeader } from '../../pages/DefaultHeader.jsx';
import { DefaultFooter } from '../../pages/DefaultFooter.jsx';

class TranslationSearchHtml extends Component {
  constructor(props) {
    super(props);
    this.wordsList = props.allSpanishWordsData || [];

    this.state = {
      containsWords: "",
      doesNotContainWords: "",
      posFilter: "all",
      lemmaFilter: "all",
      posOptions: ["all"],
      lemmaOptions: ["all"],
    };

    this.searchInputRef = React.createRef();

    // Typeahead buffer for lemma select (instance variables, not state)
    this.lemmaTypeBuffer = "";
    this.lastLemmaTypeTime = 0;
    this.typeTimeoutMs = 800; // accumulate keys typed within this window
  }

  // ------------------------------
  // Strip accents utility (kept for other uses)
  // ------------------------------
  stripAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  componentDidMount() {
    if (this.searchInputRef.current) this.searchInputRef.current.focus();

    // Build POS and lemma options
    const posSet = new Set();
    const lemmaSet = new Set();

    this.wordsList.forEach(item => {
      (item.entries || []).forEach(e => {
        if (e.pos) posSet.add(e.pos);
        if (e.lemma) lemmaSet.add(e.lemma);
      });
    });

    const sortedPos = ["all", ...Array.from(posSet).sort()];

    // Accent-sensitive sorting for lemmas (Spanish locale, variant sensitivity)
    const sortedLemmas = [
      "all",
      ...Array.from(lemmaSet).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "variant" })
      ),
    ];

    this.setState({ posOptions: sortedPos, lemmaOptions: sortedLemmas });
  }

  // ------------------------------
  // Lemma select key handler (custom multi-char typeahead, accent-sensitive)
  // ------------------------------
  handleLemmaTypeahead = (event) => {
    // Only handle printable single-character keys
    const key = event.key;
    if (!key || key.length !== 1) return;

    // We'll treat space as character too, but ignore control keys
    const now = Date.now();

    // If time since last key is greater than timeout, reset buffer
    if (now - this.lastLemmaTypeTime > this.typeTimeoutMs) {
      this.lemmaTypeBuffer = "";
    }

    this.lastLemmaTypeTime = now;
    this.lemmaTypeBuffer += key; // accumulate (case preserved, accents preserved)

    // Search for first option whose visible text starts with buffer (accent-sensitive)
    const buffer = this.lemmaTypeBuffer;
    const bufferLower = buffer.toLowerCase();

    // Use current lemma options (they are accent-sensitive sorted)
    const opts = this.state.lemmaOptions || [];

    let found = null;
    for (let i = 0; i < opts.length; i++) {
      const opt = opts[i];
      if (!opt) continue;
      // Compare in a case-insensitive but accent-sensitive way:
      if (opt.toLowerCase().startsWith(bufferLower)) {
        found = opt;
        break;
      }
    }

    if (found) {
      // Prevent browser default typeahead from fighting us
      event.preventDefault();
      // Update state so the select shows the matched option
      this.setState({ lemmaFilter: found });
    } else {
      // No match for the entire buffer — do not update selection.
      // We still let the buffer accumulate (or optionally reset).
      // Optionally reset buffer if no match on first char:
      if (this.lemmaTypeBuffer.length === 1) {
        // no match for single key; keep default behavior (do nothing)
      } else {
        // if no match for multi-char buffer, you might want to reset buffer to last char
        // so that continuing typing behaves more naturally. We'll set it to the last char.
        this.lemmaTypeBuffer = key;
        // try matching again with last char
        const lastCharLower = key.toLowerCase();
        for (let i = 0; i < opts.length; i++) {
          const opt = opts[i];
          if (!opt) continue;
          if (opt.toLowerCase().startsWith(lastCharLower)) {
            event.preventDefault();
            this.setState({ lemmaFilter: opt });
            break;
          }
        }
      }
    }

    // Clear buffer after timeout automatically (non-blocking)
    clearTimeout(this._lemmaTypeTimeout);
    this._lemmaTypeTimeout = setTimeout(() => {
      this.lemmaTypeBuffer = "";
      this.lastLemmaTypeTime = 0;
    }, this.typeTimeoutMs + 50);
  };

  // ------------------------------
  // Tokenizer & Highlighting
  // ------------------------------
  tokenizeSearchInput = (text) => {
    if (!text || !text.trim()) return [];
    const quoteCount = (text.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) return [];
    const tokens = [];
    const regex = /"([^"]+)"|(\S+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) tokens.push({ type: "phrase", value: this.stripAccents(match[1].toLowerCase()) });
      else if (match[2]) tokens.push({ type: "word", value: this.stripAccents(match[2].toLowerCase()) });
    }
    return tokens;
  };

  TranslationContains = (gloss, tokens) => {
    const text = this.stripAccents((gloss || "").toLowerCase());
    for (let t of tokens) {
      if (t.type === "phrase") {
        if (!text.includes(t.value)) return false;
      } else {
        const escaped = t.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "i");
        if (!re.test(text)) return false;
      }
    }
    return true;
  };

  TranslationDoesNotContain = (gloss, tokens) => {
    const text = this.stripAccents((gloss || "").toLowerCase());
    for (let t of tokens) {
      if (t.type === "phrase") {
        if (text.includes(t.value)) return false;
      } else {
        const escaped = t.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "i");
        if (re.test(text)) return false;
      }
    }
    return true;
  };

  highlightMatches = (gloss, tokens) => {
    if (!gloss) return "";
    const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let escaped = escapeHtml(gloss);
    const strippedGloss = this.stripAccents(gloss).toLowerCase();
    const ranges = [];
    for (const t of tokens) {
      const token = this.stripAccents(t.value);
      if (!token) continue;
      let idx = strippedGloss.indexOf(token);
      while (idx !== -1) {
        ranges.push([idx, idx + token.length]);
        idx = strippedGloss.indexOf(token, idx + 1);
      }
    }
    if (ranges.length === 0) return escaped;

    // Merge overlapping ranges
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    let [start, end] = ranges[0];
    for (let i = 1; i < ranges.length; i++) {
      const [s, e] = ranges[i];
      if (s <= end) {
        end = Math.max(end, e);
      } else {
        merged.push([start, end]);
        [start, end] = [s, e];
      }
    }
    merged.push([start, end]);

    // Build highlighted HTML
    let result = "";
    let cursor = 0;
    for (const [s, e] of merged) {
      const escStart = escapeHtml(gloss.slice(0, s)).length;
      const escEnd = escapeHtml(gloss.slice(0, e)).length;
      result += escaped.slice(cursor, escStart);
      result += `<mark class="bg-yellow-300 rounded px-1">`;
      result += escaped.slice(escStart, escEnd);
      result += `</mark>`;
      cursor = escEnd;
    }
    result += escaped.slice(cursor);
    return result;
  };

  // ------------------------------
  // Filtered list
  // ------------------------------
  filteredList = () => {
    const containsTokens = this.tokenizeSearchInput(this.state.containsWords);
    const notTokens = this.tokenizeSearchInput(this.state.doesNotContainWords);

    const results = [];
    this.wordsList.forEach(item => {
      const entries = item.entries || [];
      entries.forEach((entry, entryIndex) => {
        const gloss = entry.gloss || "";
        if (!this.TranslationContains(gloss, containsTokens)) return;
        if (!this.TranslationDoesNotContain(gloss, notTokens)) return;
        if (this.state.posFilter !== "all" && entry.pos !== this.state.posFilter) return;
        if (this.state.lemmaFilter !== "all" && entry.lemma !== this.state.lemmaFilter) return;
        results.push({ word: item.word, rank: item.rank, gloss, pos: entry.pos, entryIndex });
      });
    });

    return (
      <div className="ml-[0.25in]">
        <table className="table-auto border border-gray-300 w-auto mb-4">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300 font-semibold">&nbsp;</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300">Word</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300">Rank</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300">POS</th>
              <th className="px-3 py-2 bg-gray-200 border border-gray-300">Translation</th>
            </tr>
          </thead>
          <tbody>
            {results.map((rec, idx) => (
              <tr key={`${rec.word}-${rec.entryIndex}-${idx}`}>
                <td className="px-3 py-2 border border-gray-300">
                  <a href={`/spanish/viewTest/${rec.word}/ts`} className="text-blue-600 hover:text-blue-800">view</a>
                </td>
                <td className="px-3 py-2 border border-gray-303">{rec.word}</td>
                <td className="px-3 py-2 border border-gray-303">{rec.rank}</td>
                <td className="px-3 py-2 border border-gray-303">{rec.pos}</td>
                <td
                  className="px-3 py-2 border border-gray-303"
                  dangerouslySetInnerHTML={{ __html: this.highlightMatches(rec.gloss, containsTokens) }}
                ></td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td className="px-3 py-2 border border-gray-300" colSpan="5">No results</td>
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
      containsWords: "",
      doesNotContainWords: "",
      posFilter: "all",
      lemmaFilter: "all",
    });
    // clear any type buffer
    this.lemmaTypeBuffer = "";
    this.lastLemmaTypeTime = 0;
  };

  // ------------------------------
  // Render search boxes
  // ------------------------------
  renderSearchBox = () => (
    <div>
      <table>
        <tbody>
          {/* Contains input */}
          <tr>
            <td className="pl-[0.5in] mb-4 text-right">
              <label className="text-sm font-medium mr-2">Contains the word(s):</label>
            </td>
            <td>
              <input
                type="text"
                ref={this.searchInputRef}
                className="w-64 px-3 py-2 border rounded-md shadow-sm"
                value={this.state.containsWords}
                onChange={(e) => this.setState({ containsWords: e.target.value.slice(0, 50) })}
              />
            </td>
          </tr>

          {/* Does not contain input */}
          <tr>
            <td className="pl-[0.5in] mb-4 text-right">
              <label className="text-sm font-medium mr-2">Does not contain the&nbsp;&nbsp;<br />word(s):</label>
            </td>
            <td>
              <input
                type="text"
                className="w-64 px-3 py-2 border rounded-md shadow-sm"
                value={this.state.doesNotContainWords}
                onChange={(e) => this.setState({ doesNotContainWords: e.target.value.slice(0, 50) })}
              />
            </td>
          </tr>

          <tr>
            <td></td>
            <td>
              <div className="text-xs text-left m-[0.03125in]">
                Hint: Put phrases in double quotes, e.g. " (past participle)"
              </div>
            </td>
          </tr>

          {/* POS and Lemma Dropdowns */}
          <tr>
            <td className="text-right">
              <label className="text-sm font-medium mr-2">Part of speech (POS):</label>
            </td>
            <td className="flex space-x-4 items-center">
              {/* POS Dropdown (native) */}
              <select
                className="px-3 py-2 border rounded-md shadow-sm"
                value={this.state.posFilter}
                onChange={(e) => this.setState({ posFilter: e.target.value })}
              >
                {this.state.posOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              {/* Lemma Dropdown (native) with custom key handler to guarantee multi-char matching) */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Base:</label>
                <select
                  className="px-3 py-2 border rounded-md shadow-sm"
                  value={this.state.lemmaFilter}
                  onChange={(e) => this.setState({ lemmaFilter: e.target.value })}
                  onKeyDown={this.handleLemmaTypeahead}
                >
                  {this.state.lemmaOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </td>
          </tr>

          {/* Reset button */}
          <tr>
            <td></td>
            <td className="mt-2">
              <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
                onClick={this.resetFilters}
              >
                Reset Filters
              </button>
            </td>
          </tr>

          <tr><td colSpan="2" className="h-[0.25in]"></td></tr>
        </tbody>
      </table>
    </div>
  );

  render() {
    return (
      <div>
        <DefaultHeader />
        <div className="mb-6">
          <h1 className="text-3xl font-bold ml-[0.75in]">Translation Search</h1>
        </div>
        {this.renderSearchBox()}
        {this.filteredList()}
        <DefaultFooter />
      </div>
    );
  }
}

export default TranslationSearchHtml;
