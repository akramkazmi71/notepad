import './App.css';

function App() {

  function downloadTxtFile() {
    const element = document.createElement("a");
    const file = new Blob([document.getElementById('myInput').value], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "myFile.txt";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  }

  window.addEventListener("beforeunload", (ev) => {
    ev.preventDefault();
    return ev.returnValue = 'Are you sure you want to close?';
  });

  return (
    <div id="rulesformitem" class="formitem" className="home">
      <div className="notepad">Textpad
      <button onClick={downloadTxtFile} className="download">Download</button>
      </div>
      <div class="textwrapper"><textarea cols="5" rows="37" id="myInput" /></div>
    </div>
  );
}

export default App;
