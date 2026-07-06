import { useState } from 'react';

interface RecurringBlock {
    _id: string;
    url: string;
    startTime: string;
    endTime: string;
    days: number[];
    active: boolean;
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

function RecurringForm({ onClose }: { onClose: () => void }) {
    const [url, setUrl] = useState('');
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

    const handleAdd = async() => {
        if (!url || !startTime || !endTime || selectedDays.length === 0) {
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

            const response = await fetch('https://www.deeplockin.com/api/recurring', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url, startTime, endTime, days: selectedDays, strictMode: strictModeOverride })
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
                const stored = await chrome.storage.local.get('recurringBlocks');
                const existing = (stored.recurringBlocks as RecurringBlock[]) || [];
                await chrome.storage.local.set({ recurringBlocks: [...existing, data.block] });
                onClose();
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sitechoicebackground" style={{ position: 'fixed', width: '30%'}}>
            <h3 id="websiteinfo" style={{ position: 'fixed', top: '1%' }}>Recurring Block</h3>
            <p id="url">URL:</p>
            <input 
                id="urltext"
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="e.g. youtube.com"
            />

            <div style={{ display: 'flex', gap: 6, position: 'fixed', top: '30%', left: '20%' }}>
                {PRESETS.map(preset => (
                    <button 
                        key={preset.label}
                        onClick={() => applyPreset(preset.days)}
                        style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: JSON.stringify(selectedDays.sort()) === JSON.stringify([...preset.days].sort())
                                ? '#0099ff'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontSize: 11,
                            cursor: 'pointer'
                        }}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 6, position: 'fixed', top: '42%', left: '20%' }}>
                {DAYS.map(day => (
                    <button 
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: selectedDays.includes(day.value)
                                ? '#0099ff'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: selectedDays.includes(day.value) ? 700 : 400
                        }}
                    >
                        {day.label}
                    </button>
                ))}
            </div>
            
            <p id="time">Time:</p>
            <input 
                id="starttime"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
            />
            <p id="to" style={{ position: 'fixed', left: '45.5%', top: '59%' }}>to</p>
            <input 
                id="endtime"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{ position: 'fixed', left: '51%' }}
            /> 

            {error && <p className="error-message">{error}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'fixed', top: '72%', left: '20%' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>Strict mode:</p>
                <button
                    onClick={() => setStrictModeOverride(null)}
                    style={{
                        padding: '3px 8px',
                        borderRadius: 20,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: strictModeOverride === null ? '#0099ff' : 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: 10,
                        cursor: 'pointer'
                    }}
                >
                    Default
                </button>
                <button
                    onClick={() => setStrictModeOverride(true)}
                    style={{
                        padding: '3px 8px',
                        borderRadius: 20,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: strictModeOverride === true ? '#ff4d4d' : 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: 10,
                        cursor: 'pointer'
                    }}
                >
                    On
                </button>
                <button
                    onClick={() => setStrictModeOverride(false)}
                    style={{
                        padding: '3px 8px',
                        borderRadius: 20,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: strictModeOverride === false ? '#4CAF50' : 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: 10,
                        cursor: 'pointer'
                    }}
                >
                    Off
                </button>
            </div>
            <button className="addbutton" onClick={handleAdd} disabled={loading}>
                {loading ? 'Adding...' : 'Add'}
            </button>
            <button id="xbutton" onClick={onClose}>X</button>
        </div>
    );
}

export default RecurringForm;