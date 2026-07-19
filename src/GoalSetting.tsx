import { useState, useEffect } from 'react';

interface Goals {
    dailyMinutes: number;
    weeklyMinutes: number;
}

const DAILY_PRESETS = [60, 120, 180, 240];
const WEEKLY_PRESETS = [300, 600, 900, 1200];

const formatMinutes = (mins: number) => {
    if (mins === 0) return 'No goal set';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

function GoalSetting() {
    const [goals, setGoals] = useState<Goals>({ dailyMinutes: 0, weeklyMinutes: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchGoals = async () => {
            const result = await chrome.storage.local.get(['token', 'goals']);
            const token = result.token as string;

            // Load cached goals immediately
            if (result.goals) {
                setGoals(result.goals as Goals);
            }

            // Fetch fresh from backend
            const response = await fetch('https://www.deeplockin.com/api/user/goals', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.goals) {
                setGoals(data.goals);
                await chrome.storage.local.set({ goals: data.goals });
            }
        };
        fetchGoals();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

            const response = await fetch('https://www.deeplockin.com/api/user/goals', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify(goals)
            });

            const data = await response.json();
            if (data.goals) {
                setGoals(data.goals);
                await chrome.storage.local.set({ goals: data.goals });
                setSuccess('Goals saved!');
                setTimeout(() => setSuccess(''), 2000);
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
        <div className="focus-wrap">

            {/* Daily goal */}
            <div className="focus-goal-card">
                <div className="focus-goal-header">
                    <span className="focus-goal-title">🎯 Daily Focus Goal</span>
                    <span className="focus-goal-value">{formatMinutes(goals.dailyMinutes)}</span>
                </div>

                <input
                    type="range"
                    min={0}
                    max={480}
                    step={15}
                    value={goals.dailyMinutes}
                    onChange={e => setGoals(prev => ({ ...prev, dailyMinutes: parseInt(e.target.value) }))}
                    className="focus-goal-slider"
                />

                <div className="focus-goal-presets">
                    <button
                        onClick={() => setGoals(prev => ({ ...prev, dailyMinutes: 0 }))}
                        className={goals.dailyMinutes === 0 ? 'glass-pill glass-pill-active' : 'glass-pill'}
                    >
                        None
                    </button>
                    {DAILY_PRESETS.map(mins => (
                        <button
                            key={mins}
                            onClick={() => setGoals(prev => ({ ...prev, dailyMinutes: mins }))}
                            className={goals.dailyMinutes === mins ? 'glass-pill glass-pill-active' : 'glass-pill'}
                        >
                            {mins / 60}h
                        </button>
                    ))}
                </div>
            </div>

            {/* Weekly goal */}
            <div className="focus-goal-card">
                <div className="focus-goal-header">
                    <span className="focus-goal-title">📅 Weekly Focus Goal</span>
                    <span className="focus-goal-value">{formatMinutes(goals.weeklyMinutes)}</span>
                </div>

                <input
                    type="range"
                    min={0}
                    max={2400}
                    step={30}
                    value={goals.weeklyMinutes}
                    onChange={e => setGoals(prev => ({ ...prev, weeklyMinutes: parseInt(e.target.value) }))}
                    className="focus-goal-slider"
                />

                <div className="focus-goal-presets">
                    <button
                        onClick={() => setGoals(prev => ({ ...prev, weeklyMinutes: 0 }))}
                        className={goals.weeklyMinutes === 0 ? 'glass-pill glass-pill-active' : 'glass-pill'}
                    >
                        None
                    </button>
                    {WEEKLY_PRESETS.map(mins => (
                        <button
                            key={mins}
                            onClick={() => setGoals(prev => ({ ...prev, weeklyMinutes: mins }))}
                            className={goals.weeklyMinutes === mins ? 'glass-pill glass-pill-active' : 'glass-pill'}
                        >
                            {mins / 60}h
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="glass-success-text">{success}</p>}

            <button className="add-website-btn" onClick={handleSave} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Saving...' : 'Save Goals'}
            </button>
        </div>
    );
}

export default GoalSetting;
