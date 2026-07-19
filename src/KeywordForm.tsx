import { useState } from 'react';

interface KeywordBlock {
    _id: string;
    keyword: string;
    startTime: string;
    endTime: string;
    days: number[];
    strictMode: boolean | null;
}

const DAYS = [
    { label: 'Su', value: 0 },
    { label: 'Mo', value: 1 },
    { label: 'Tu', value: 2 },
    { label: 'We', value: 3 },
    { label: 'Th', value: 4 },
    { label: 'Fr', value: 5 },
    { label: 'Sa', value: 6 },
];

const PRESETS = [
    { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
    { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
    { label: 'Weekends', days: [0, 6] },
];

function KeywordForm({ onClose }: { onClose: () => void }) {
    const [keyword, setKeyword] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [strictModeOverride, setStrictModeOverride] = useState<boolean | null>(null);

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const applyPreset = (days: number[]) => setSelectedDays(days);

    const handleAdd = async () => {
        if (!keyword || !startTime || !endTime || selectedDays.length === 0) {
            setError('Please fill in all fields and select at least one day');
            return;
        }
        if (endTime <= startTime) {
            setError('End time must be after start time');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

            const response = await fetch('https://www.deeplockin.com/api/keywords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ keyword: keyword.trim(), startTime, endTime, days: selectedDays, strictMode: strictModeOverride })
            });

            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const data = await response.json();
            if (data.error) {
                setError(data.error);
            } else {
                const stored = await chrome.storage.local.get('keywordBlocks');
                const existing = (stored.keywordBlocks as KeywordBlock[]) || [];
                await chrome.storage.local.set({ keywordBlocks: [...existing, data.block] });
                onClose();
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isPresetActive = (days: number[]) =>
        JSON.stringify(selectedDays.slice().sort()) === JSON.stringify([...days].sort());

    const strictOptions: { label: string; value: boolean | null; color: string }[] = [
        { label: 'Default', value: null, color: 'oklch(0.6 0.19 265)' },
        { label: 'On', value: true, color: '#ff4d4d' },
        { label: 'Off', value: false, color: '#4CAF50' }
    ];

    return (
        <div className="glass-modal">
            <div className="glass-modal-header">
                <h3 className="glass-modal-title">Keyword Block</h3>
                <button className="glass-close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="glass-field">
                <label className="glass-label">Keyword</label>
                <input
                    className="glass-input"
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="e.g. gambling, news, reddit"
                    style={{ width: '100%' }}
                />
            </div>

            <div className="glass-field">
                <label className="glass-label">Days</label>
                <div className="glass-pill-row">
                    {PRESETS.map(preset => (
                        <button
                            key={preset.label}
                            className={isPresetActive(preset.days) ? 'glass-pill glass-pill-active' : 'glass-pill'}
                            onClick={() => applyPreset(preset.days)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <div className="glass-day-row">
                    {DAYS.map(day => (
                        <button
                            key={day.value}
                            className={selectedDays.includes(day.value) ? 'glass-day glass-day-active' : 'glass-day'}
                            onClick={() => toggleDay(day.value)}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-field">
                <label className="glass-label">Time</label>
                <div className="glass-row">
                    <input
                        className="glass-input"
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                    />
                    <span>to</span>
                    <input
                        className="glass-input"
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                    />
                </div>
            </div>

            {error && <p className="error-message">{error}</p>}

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

            <button className="add-website-btn" onClick={handleAdd} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Adding...' : 'Add'}
            </button>
        </div>
    );
}

export default KeywordForm;
