import './App.css';
import Menu from './Menu.tsx';
import { HashRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <HashRouter>
      <div className='matrixBackground'>
        <h1>Welcome to LockedIn!</h1>
        <a href={chrome.runtime.getURL("index.html#/menu")} target="_blank" rel="noreferrer">Click here to get started</a>
      </div>
      <Routes>
        <Route path="/menu" element={<Menu/>}/>
      </Routes>
    </HashRouter> 
  );
}

export default App;