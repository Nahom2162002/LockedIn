import { useState } from 'react';

function ResetPassword() {
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [confirmpassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const token = new URLSearchParams(window.location.search).get('token');

    const handleReset = async () => {
        if (!password) {
            setError('Please enter a new password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`https://lockedin-jovk.onrender.com/auth/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await response.json();
            if (data.message) {
                setMessage('Password reset successful! You can now log in.');
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <h2>Reset Password</h2>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password"/>
            <input type="password" value={confirmpassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password"/>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            <button onClick={handleReset} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
            </button>
        </div>
    )
}

export default ResetPassword;