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
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!email || !username || !password || !confirmpassword) {
            setError("Please fill in all fields");
            return;
        }

        if (password !== confirmpassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('https://lockedin-jovk.onrender.com/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password})
            });
            const data = await response.json();
            if (data.userId) {
                await chrome.storage.local.set({ userId: data.userId });
                alert("Account successfully created!");
                navigate('/login');
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("Connection failed. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
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
                <button className="authbutton" onClick={handleCreate} disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                <button className="authbutton" onClick={handleBack}>Back</button>
            </div>
        </div>
    );
}

export default CreateAccount;