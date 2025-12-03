import { useState, useEffect, useRef } from 'react';
import { jsonrepair } from 'jsonrepair';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { go } from '@codemirror/lang-go';
import { SearchQuery } from '@codemirror/search';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('textpad');
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState('Plain Text');
  const findInputRef = useRef(null);
  const editorViewRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Detect language from content
  useEffect(() => {
    const detected = detectLanguage(text);
    setDetectedLanguage(detected);
  }, [text]);

  function detectLanguage(content) {
    if (!content.trim()) return 'Plain Text';

    // JSON detection
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        JSON.parse(content);
        return 'JSON';
      } catch (e) {
        // Continue to other checks
      }
    }

    // TypeScript detection (check before JavaScript)
    if (/\b(interface|type)\s+\w+/.test(content) ||
      /:\s*(string|number|boolean|any)/.test(content) ||
      /implements\s+\w+/.test(content)) {
      return 'TypeScript';
    }

    // Go detection
    if (/package\s+\w+/.test(content) ||
      /func\s+\w+/.test(content) ||
      /fmt\./.test(content) ||
      /go\s+func/.test(content)) {
      return 'Go';
    }

    // Python detection (improved with multiline flag)
    if (/^\s*def\s+\w+/m.test(content) ||
      /^\s*class\s+\w+/m.test(content) ||
      /^\s*import\s+\w+/m.test(content) ||
      /^\s*from\s+\w+\s+import/m.test(content) ||
      /^\s*print\s*\(/m.test(content)) {
      return 'Python';
    }

    // HTML detection
    if (/<(!DOCTYPE|html|head|body|div|span|p|a|img)/.test(content)) {
      return 'HTML';
    }

    // CSS detection
    if (/[.#]?\w+\s*\{[^}]*\}/.test(content) && /[a-z-]+:\s*[^;]+;/.test(content)) {
      return 'CSS';
    }

    // Markdown detection
    if (/^#{1,6}\s/m.test(content) ||
      /\[.*\]\(.*\)/.test(content) ||
      /^[-*]\s/m.test(content)) {
      return 'Markdown';
    }

    // JavaScript detection
    if (/\b(function|const|let|var|=>|import|export|require)\b/.test(content)) {
      return 'JavaScript';
    }

    return 'Plain Text';
  }

  function getLanguageExtension() {
    switch (detectedLanguage) {
      case 'JSON':
        return json();
      case 'JavaScript':
        return javascript();
      case 'TypeScript':
        return javascript({ typescript: true });
      case 'Python':
        return python();
      case 'HTML':
        return html();
      case 'CSS':
        return css();
      case 'Markdown':
        return markdown();
      case 'Go':
        return go();
      default:
        return [];
    }
  }

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  function downloadTxtFile() {
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    let docName = fileName.trim();
    if (docName === "") docName = "textpad";
    element.download = docName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function prettyPrint() {
    try {
      // Try to repair the JSON first if it's invalid, or just parse it if it's valid
      let repaired;
      try {
        repaired = jsonrepair(text);
      } catch (err) {
        // If repair fails, it might be multiple objects concatenated. Try wrapping in []
        console.log("Initial repair failed, trying to wrap in []");
        repaired = jsonrepair(`[${text}]`);
      }
      const obj = JSON.parse(repaired);
      const pretty = JSON.stringify(obj, undefined, 4);
      setText(pretty);
    } catch (err) {
      console.error("JSON formatting failed:", err);
      alert("Could not format JSON. Please check the syntax.");
    }
  }

  function findNext() {
    if (!findText || !editorViewRef.current) {
      setCurrentMatch(0);
      setTotalMatches(0);
      return;
    }

    const view = editorViewRef.current;
    const content = text;
    const searchText = findText.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Find all matches
    const matches = [];
    let pos = 0;
    while ((pos = lowerContent.indexOf(searchText, pos)) !== -1) {
      matches.push(pos);
      pos += searchText.length;
    }

    setTotalMatches(matches.length);

    if (matches.length === 0) {
      setCurrentMatch(0);
      return;
    }

    // Get current cursor position
    const currentPos = view.state.selection.main.head;
    let nextMatchIndex = matches.findIndex(pos => pos >= currentPos);

    // Wrap around if needed
    if (nextMatchIndex === -1) {
      nextMatchIndex = 0;
    }

    const matchPos = matches[nextMatchIndex];
    setCurrentMatch(nextMatchIndex + 1);

    // Set selection in CodeMirror
    view.dispatch({
      selection: { anchor: matchPos, head: matchPos + findText.length },
      scrollIntoView: true
    });
    view.focus();
  }


  function replace() {
    if (!findText || !editorViewRef.current) return;

    const view = editorViewRef.current;
    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);

    if (selectedText.toLowerCase() === findText.toLowerCase()) {
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: replaceText },
        selection: { anchor: selection.from, head: selection.from + replaceText.length }
      });
    } else {
      findNext();
    }
  }

  function replaceAll() {
    if (!findText) return;
    // Case-insensitive replace all
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); // Added 'i' flag
    const newText = text.replace(regex, replaceText);
    setText(newText);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">Notepad</div>
        <div className="controls">
          {detectedLanguage !== 'Plain Text' && (
            <span className="detected-language">{detectedLanguage}</span>
          )}
          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`btn btn-icon ${showFindReplace ? 'active' : ''}`}
            title="Find and Replace"
          >
            🔍
          </button>
          <button
            onClick={toggleTheme}
            className="btn btn-icon"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="filename-input"
            placeholder="Filename"
          />
          <button onClick={prettyPrint} className="btn btn-primary">Format JSON</button>
          <button onClick={downloadTxtFile} className="btn btn-secondary">Download</button>
        </div>
      </header>

      {showFindReplace && (
        <div className="find-replace-toolbar">
          <div className="fr-group">
            <input
              ref={findInputRef}
              type="text"
              placeholder="Find..."
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                setCurrentMatch(0);
                setTotalMatches(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  findNext();
                }
              }}
              className="fr-input"
            />
            {totalMatches > 0 && (
              <span className="match-counter">
                {currentMatch}/{totalMatches}
              </span>
            )}
            <button onClick={findNext} className="btn btn-secondary btn-sm">Next</button>
          </div>
          <div className="fr-group">
            <input
              type="text"
              placeholder="Replace..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="fr-input"
            />
            <button onClick={replace} className="btn btn-secondary btn-sm">Replace</button>
            <button onClick={replaceAll} className="btn btn-secondary btn-sm">Replace All</button>
          </div>
        </div>
      )}

      <main className="editor-container">
        <CodeMirror
          value={text}
          height="100%"
          theme={theme === 'dark' ? oneDark : 'light'}
          onChange={(value) => setText(value)}
          extensions={[getLanguageExtension()]}
          onCreateEditor={(view) => {
            editorViewRef.current = view;
          }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          className="codemirror-wrapper"
        />
      </main>
    </div >
  );
}

export default App;
