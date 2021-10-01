import './App.css';

function App() {

  function downloadTxtFile() {
    const element = document.createElement("a");
    const file = new Blob([document.getElementById('myInput').value], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    var docName = document.getElementById('name').value;
    console.log('docName: ' + docName);
    if(docName === "")
      docName = "textpad";
    element.download = docName;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  }

  function prettyPrint() {
    var ugly = document.getElementById('myInput').value;
    var obj = JSON.parse(ugly);
    var pretty = JSON.stringify(obj, undefined, 4);
    document.getElementById('myInput').value = pretty;
}

  window.addEventListener("beforeunload", (ev) => {
    ev.preventDefault();
    return ev.returnValue = 'Are you sure you want to close?';
  });

  return (
    <div id="rulesformitem" class="formitem" className="home">
      <div className="notepad">  
      <input type="text" id="name" name="fname" className="titleTag" placeholder="Textpad" />
      <button onClick={prettyPrint} className="format">Format JSON</button>
      <button onClick={downloadTxtFile} className="download">Download</button>
      </div>
      <div class="textwrapper"><textarea cols="5" rows="45" id="myInput" /></div>
    </div>
  );
}

export default App;
