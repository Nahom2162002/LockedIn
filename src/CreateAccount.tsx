import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LockIcon from './assets/lockIcon.png';

function CreateAccount() {
    const [email, setEmail] = useState('');
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmpassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleCreate = async () => {
        try {
            const response = await fetch('https://lockedin-jovk.onrender.com/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password})
            });
            const data = await response.json();
            if (data.userId && password == confirmpassword) {
                await chrome.storage.local.set({ userId: data.userId });
                alert("Account successfully created!");
                navigate('/login');
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key == 'Enter') {
            action();
        }
    };

    const handleBack = () => {
        navigate('/login');
    }

    return (
        <div className="create-account-background">
            <div className="create">
                <img src={LockIcon} id="lock-icon"/>
                <input id="email" type="email" value={email} onKeyDown={(e) => handleKeyDown(e, handleCreate)} onChange={(e) => setEmail(e.target.value)} placeholder='Email Address'/>
                <input id="usernametext" type="text" value={username} onKeyDown={(e) => handleKeyDown(e, handleCreate)} onChange={(e) => setUserName(e.target.value)} placeholder='Username'/>
                <input id="passwordtext" type="password" value={password} onKeyDown={(e) => handleKeyDown(e, handleCreate)} onChange={(e) => setPassword(e.target.value)} placeholder='Password'/>
                <input id="confirmpassword" type="password" value={confirmpassword} onKeyDown={(e) => handleKeyDown(e, handleCreate)} onChange={(e) => setConfirmPassword(e.target.value)} placeholder='Confirm Password'/>
                {error && <p className="error-message">{error}</p>}
                <button className="authbutton" onClick={handleCreate}>Create Account</button>
                <button className="authbutton" onClick={handleBack}>Back</button>
            </div>
        </div>
    );
}

export default CreateAccount;