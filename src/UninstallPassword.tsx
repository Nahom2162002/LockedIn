import { useState } from 'react';

interface UninstallPasswordProps {
    isSet: boolean;
    onClose: () => void;
    onUpdate: (isSet: boolean) => void;
}

function UninstallPassword({ isSet, onClose, onUpdate }: UninstallPasswordProps) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSet = async () => {
        if (!password) {
            setError('Please enter a password');
            return;
        }
        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

            const response = await fetch('https://www.deeplockin.com/api/user/uninstall-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();
            if (data.message) {
                await chrome.storage.local.set({ uninstallPasswordSet: true });
                onUpdate(true);
                setSuccess('Uninstall protection enabled!');
                setTimeout(() => onClose(), 1500);
            } else {
                setError(data.error);
            }
        } catch {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

            const response = await fetch('https://www.deeplockin.com/api/user/uninstall-password', {
                method: 'DELETE',
                headers: { 'authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.message) {
                await chrome.storage.local.set({ uninstallPasswordSet: false });
                onUpdate(false);
                setSuccess('Uninstall protection disabled!');
                setTimeout(() => onClose(), 1500);
            } else {
                setError(data.error);
            }
        } catch {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-modal">
            <div className="glass-modal-header">
                <h3 className="glass-modal-title">🔐 Uninstall Protection</h3>
                <button className="glass-close-btn" onClick={onClose}>✕</button>
            </div>

            <p style={{ color: 'oklch(0.7 0.02 260)', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }}>
                {isSet
                    ? 'Uninstall protection is currently active. Removing it will let LockedIn be disabled or uninstalled without a password.'
                    : 'Set a password as a reminder commitment. To disable LockedIn you must return here and enter your password to remove protection first.'
                }
            </p>

            {!isSet && (
                <>
                    <div className="glass-field">
                        <label className="glass-label">Password</label>
                        <input
                            className="glass-input"
                            type="password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            placeholder="Set uninstall password"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="glass-field">
                        <label className="glass-label">Confirm password</label>
                        <input
                            className="glass-input"
                            type="password"
                            value={confirm}
                            onChange={e => { setConfirm(e.target.value); setError(''); }}
                            placeholder="Confirm password"
                            style={{ width: '100%' }}
                        />
                    </div>
                </>
            )}

            {error && <p className="error-message">{error}</p>}
            {success && <p className="glass-success-text">{success}</p>}

            {!isSet ? (
                <button
                    className="add-website-btn"
                    onClick={handleSet}
                    disabled={loading}
                    style={{ width: '100%' }}
                >
                    {loading ? 'Setting...' : 'Enable Protection'}
                </button>
            ) : (
                <button
                    className="add-website-btn"
                    onClick={handleRemove}
                    disabled={loading}
                    style={{
                        width: '100%',
                        background: 'oklch(0.55 0.16 25)',
                        boxShadow: '0 8px 24px -6px oklch(0.55 0.16 25 / 0.6)'
                    }}
                >
                    {loading ? 'Removing...' : 'Remove Protection'}
                </button>
            )}
        </div>
    );
}

export default UninstallPassword;
