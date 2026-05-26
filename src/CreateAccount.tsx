import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateAccount() {
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');
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
            if (data.userId) {
                await chrome.storage.local.set({ userId: data.userId });
                navigate('/menu');
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };
    
    return (
        <div className="create-account-background">

        </div>
    );
}

export default CreateAccount;