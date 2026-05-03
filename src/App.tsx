import './App.css';
import Menu from './Menu.tsx';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className='matrixBackground'>
        <h1>Welcome to LockedIn!</h1>
        <Link to="/menu">Click here to get started</Link>
      </div>
      
      <Routes>
        <Route path="/menu" element={<Menu/>}/>
      </Routes>
    </BrowserRouter> 
  )
}

export default App;