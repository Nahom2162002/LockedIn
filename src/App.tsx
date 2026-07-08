import './App.css';
import Menu from './Menu.tsx';
import Login from './Login.tsx';
import CreateAccount from './CreateAccount.tsx';
import ForgotPassword from './ForgotPassword.tsx';
import { HashRouter, Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <div className='matrixBackground'>
      <div style={{ animation: 'fadeInUp 0.8s ease-out forwards' }}>
        <h1>Welcome to LockedIn!</h1>
        <a href={chrome.runtime.getURL("index.html#/login")} target="_blank" rel="noreferrer">Click here to get started</a>
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/menu" element={<Menu/>}/>
        <Route path="/create" element={<CreateAccount/>}/>
        <Route path="/forgot" element={<ForgotPassword/>}/>
      </Routes>
    </HashRouter> 
  );
}

export default App;