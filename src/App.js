import './App.css';

function App() {

  window.addEventListener("beforeunload", (ev) => {
    ev.preventDefault();
    return ev.returnValue = 'Are you sure you want to close?';
  });

  return (
    <div id="rulesformitem" class="formitem" className="home">
      <div className="notepad">Notepad</div>
      <div class="textwrapper"><textarea cols="1" rows="42" /></div>
    </div>
  );
}

export default App;
