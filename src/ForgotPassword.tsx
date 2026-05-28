import { useState } from 'react';
import LockIcon from './assets/lockIcon.png';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key == 'Enter') {
            action();
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email');
            return;
        }

        try {
            const response = await fetch('https://lockedin-jovk.onrender.com/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.message) {
                setMessage('Password reset email sent! Check your inbox.');
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="forgot-password-background">
            <div className="forgot">
                <img src={LockIcon} id="lock-icon"/>
                <h3 id="verify">Please input Email Address for verification email</h3>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleForgotPassword)} placeholder='Enter your email'/>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}
                <button className="authbutton" onClick={handleForgotPassword}>Send Reset Email</button>
            </div>
        </div>
    );
}

export default ForgotPassword;