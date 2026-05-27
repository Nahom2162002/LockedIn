import { useState } from 'react';
import LockIcon from './assets/lockIcon.png';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    /*
    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key == 'Enter') {
            action();
        }
    };*/

    return (
        <div className="forgot-password-background">
            <div className="forgot">
                <img src={LockIcon} id="lock-icon"/>
                <h3 id="verify">Please input Email Address for verification email</h3>
                <input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Email Address'/>
                <button className="authbutton" onClick={() => alert('LoL')}>Send</button>
            </div>
        </div>
    );
}

export default ForgotPassword;