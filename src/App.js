import './App.css';

function App() {

  window.addEventListener("beforeunload", (ev) => {
    ev.preventDefault();
    return ev.returnValue = 'Are you sure you want to close?';
  });

  return (
    <div id="rulesformitem" class="formitem" className="home">
      <div className="notepad">Textpad</div>
      <div class="textwrapper"><textarea cols="5" rows="35" /></div>
    </div>
  );
}

export default App;
