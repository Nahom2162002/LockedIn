import { useState } from 'react';
import LockIcon from './assets/lockIcon.png';
//import ForgotPassword from './ForgotPassword.tsx';
//import CreateAccount from './CreateAccount.tsx';

function Login() {
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');

    return (
        <div className="login-background">
            <div className="login">
                <img src={LockIcon} id="lock-icon"/>
                <input id="usernametext" type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder='Username'/>
                <input id="passwordtext" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder='Password'/>
                <input id="loginbutton" type="button" placeholder='Log in'/>
                <input id="createaccountbutton" type="button" placeholder='Create Account'/>
            </div>
        </div>
    );
}

export default Login;