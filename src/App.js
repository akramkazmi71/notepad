import './App.css';

import { useState, useEffect, useRef } from 'react';
import { jsonrepair } from 'jsonrepair';
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
  const textareaRef = useRef(null);

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
    if (!findText) return;
    const textarea = textareaRef.current;
    const startPos = textarea.selectionEnd;
    const content = textarea.value;

    let index = content.indexOf(findText, startPos);
    if (index === -1) {
      // Wrap around
      index = content.indexOf(findText);
    }

    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + findText.length);
    } else {
      alert('Text not found');
    }
  }

  function replace() {
    if (!findText) return;
    const textarea = textareaRef.current;
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
        </div>
      </header>

      {showFindReplace && (
        <div className="find-replace-toolbar">
          <div className="fr-group">
            <input
              type="text"
              placeholder="Find..."
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="fr-input"
            />
            <button onClick={findNext} className="btn btn-secondary btn-sm">Find Next</button>
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
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="editor-textarea"
          placeholder="Type or paste your text/JSON here..."
          spellCheck="false"
        />
      </main>
    </div>
  );
}

export default App;
