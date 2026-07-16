import { useState, useEffect } from 'react';

function RestrictionInfo({ onClose }: {onClose: () => void}) {
    const [text, setText] = useState('');
    const [date, setDate] = useState('');
    const [starttime, setStartTime] = useState('');
    const [endtime, setEndTime] = useState('');
    const [error, setError] = useState('');
    const [strictModeOverride, setStrictModeOverride] = useState<boolean | null>(null);
    const [plan, setPlan] = useState<string>('free');

    useEffect(() => {
        const getplan = async () => {
            const result = await chrome.storage.local.get('plan');
            setPlan((result.plan as string) || 'free');
        };
        getplan();
    }, []);

    const addWebsite = async () => {
        if (!text || !date || !starttime || !endtime) {
            setError('Please fill in all fields');
            return;
        }

        if (endtime <= starttime) {
            setError("End time must be after start time");
            return;
        }

        if (starttime < currentTime) {
            setError("This time has already passed");
            return;
        }

        try {
            const { token } = await chrome.storage.local.get('token');

            if (!token) {
                console.error('No userId found');
                return;
            }

            const response = await fetch('https://www.deeplockin.com/api/websites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: text,
                    dateCreated: date,
                    startTime: starttime,
                    endTime: endtime,
                    strictMode: strictModeOverride
                })
            });

            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const data = await response.json();

            if (response.status === 403 && data.limitReached) {
                setError('You\'ve reached the 3 site limit. Upgrade to Pro for unlimited blocking.');
                return;
            }

            if (data.error) {
                setError(data.error);
            } else {
                onClose();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const strictOptions: { label: string; value: boolean | null; color: string }[] = [
        { label: 'Default', value: null, color: 'oklch(0.6 0.19 265)' },
        { label: 'On', value: true, color: '#ff4d4d' },
        { label: 'Off', value: false, color: '#4CAF50' }
    ];

    return (
        <div className="glass-modal">
            <div className="glass-modal-header">
                <h3 className="glass-modal-title">Website information</h3>
                <button className="glass-close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="glass-field">
                <label className="glass-label">URL</label>
                <input
                    className="glass-input"
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter URL here"
                    style={{ width: '100%' }}
                />
            </div>

            <div className="glass-field">
                <label className="glass-label">Date</label>
                <input
                    className="glass-input"
                    type="date"
                    value={date}
                    min={today}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div className="glass-field">
                <label className="glass-label">Time</label>
                <div className="glass-row">
                    <input
                        className="glass-input"
                        type="time"
                        value={starttime}
                        min={date === today ? currentTime : undefined}
                        onChange={(e) => setStartTime(e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                    />
                    <span>to</span>
                    <input
                        className="glass-input"
                        type="time"
                        value={endtime}
                        min={starttime}
                        onChange={(e) => setEndTime(e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                    />
                </div>
            </div>

            {error && <p className="error-message">{error}</p>}

            {plan === 'pro' && (
                <div className="glass-field">
                    <label className="glass-label">Strict mode</label>
                    <div className="glass-segment">
                        {strictOptions.map(opt => (
                            <button
                                key={opt.label}
                                className="glass-segment-option"
                                onClick={() => setStrictModeOverride(opt.value)}
                                style={strictModeOverride === opt.value ? {
                                    background: opt.color,
                                    color: 'white',
                                    fontWeight: 700,
                                    boxShadow: `0 0 14px -2px ${opt.color}`
                                } : undefined}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <button className="add-website-btn" onClick={addWebsite} style={{ width: '100%' }}>
                Add
            </button>
        </div>
    );
}

export default RestrictionInfo;
