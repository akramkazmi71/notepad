import './App.css';

import { useState, useEffect, useRef } from 'react';

import { jsonrepair } from 'jsonrepair';
import Editor from 'react-simple-code-editor';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css'; // Dark theme by default
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('textpad');
  const [detectedLanguage, setDetectedLanguage] = useState('Plain Text');
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
  const findInputRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
    if (!findText) {
      setCurrentMatch(0);
      setTotalMatches(0);
      return;
    }
    const textarea = document.getElementById('code-editor-textarea');
    if (!textarea) return;
    const content = textarea.value;

    // Find all matches
    const matches = [];
    let pos = 0;
    while ((pos = content.indexOf(findText, pos)) !== -1) {
      matches.push(pos);
      pos += findText.length;
    }

    setTotalMatches(matches.length);

    if (matches.length === 0) {
      setCurrentMatch(0);
      return;
    }

    // Find next match from current cursor position
    const startPos = textarea.selectionEnd;
    let nextMatchIndex = matches.findIndex(pos => pos >= startPos);

    // Wrap around if we're past the last match
    if (nextMatchIndex === -1) {
      nextMatchIndex = 0;
    }

    const matchPos = matches[nextMatchIndex];
    setCurrentMatch(nextMatchIndex + 1);

    // Focus and highlight the match in the editor
    textarea.focus();
    textarea.setSelectionRange(matchPos, matchPos + findText.length);
  }


  function replace() {
    if (!findText) return;
    const textarea = document.getElementById('code-editor-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (selectedText === findText) {
      const newText = text.substring(0, start) + replaceText + text.substring(end);
      setText(newText);
      // Restore selection/cursor after React update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + replaceText.length);
      }, 0);
    } else {
      findNext();
    }
  }

  function replaceAll() {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newText = text.replace(regex, replaceText);
    setText(newText);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">Notepad</div>
        <div className="controls">
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
          <span className="detected-language">{detectedLanguage}</span>
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
        <Editor
          value={text}
          onValueChange={code => setText(code)}
          onKeyDown={(e) => {
            // F3 or Ctrl+G to find next
            if ((e.key === 'F3' || (e.ctrlKey && e.key === 'g')) && findText) {
              e.preventDefault();
              findNext();
            }
          }}
          highlight={code => {

            if (!code) {
              setDetectedLanguage('Plain Text');
              return '';
            }
            const result = hljs.highlightAuto(code);
            setDetectedLanguage(result.language ? result.language : 'Plain Text');
            return result.value;
          }}
          padding={10}
          textareaId="code-editor-textarea"
          className="editor-textarea"
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
            minHeight: '100%',
          }}
          textareaClassName="editor-textarea-internal"
        />
      </main>
    </div >
  );
}

export default App;
