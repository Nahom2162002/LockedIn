import { useState } from 'react';
import { CATEGORIES } from './categories';

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

function CategoryBlock({ onClose }: { onClose: () => void}) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [scheduleType, setScheduleType] = useState<'one-time' | 'recurring'>('one-time');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const isPresetActive = (days: number[]) =>
        JSON.stringify(selectedDays.slice().sort()) === JSON.stringify([...days].sort());

    const handleBlock = async () => {
        if (!selectedCategory) {
            setError('Please select a category');
            return;
        }
        if (!startTime || !endTime) {
            setError('Please set a time range');
            return;
        }
        if (endTime <= startTime) {
            setError('End time must be after start time');
            return;
        }
        if (scheduleType === 'one-time' && !date) {
            setError('Please select a date');
            return;
        }
        if (scheduleType === 'recurring' && selectedDays.length === 0) {
            setError('Please select at least one day');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

            const urls = CATEGORIES[selectedCategory].urls;

            const body: any = {
                urls,
                startTime,
                endTime,
                scheduleType
            };

            if (scheduleType === 'one-time') {
                body.dateCreated = date;
            } else {
                body.days = selectedDays;
            }

            const response = await fetch('https://www.deeplockin.com/api/category-block', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
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
                setSuccess(`${CATEGORIES[selectedCategory].label} blocked successfully!`);
                setTimeout(() => onClose(), 1500);
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-modal">
            <div className="glass-modal-header">
                <h3 className="glass-modal-title">Block Category</h3>
                <button className="glass-close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="glass-field">
                <label className="glass-label">Category</label>
                <div className="glass-pill-row">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <button key={key}
                            className={selectedCategory === key ? 'category-pill category-pill-active' : 'category-pill'}
                            onClick={() => setSelectedCategory(key)}
                        >
                            {cat.emoji} {cat.label}
                        </button>
                    ))}
                </div>
                {selectedCategory && (
                    <p className="glass-helper-text">
                        Blocks: {CATEGORIES[selectedCategory].urls.slice(0, 4).join(', ')}
                        {CATEGORIES[selectedCategory].urls.length > 4 && ` +${CATEGORIES[selectedCategory].urls.length - 4} more`}
                    </p>
                )}
            </div>

            <div className="glass-field">
                <div className="glass-segment">
                    <button
                        className="glass-segment-option glass-segment-toggle"
                        onClick={() => setScheduleType('one-time')}
                        style={scheduleType === 'one-time' ? {
                            background: 'oklch(0.6 0.19 265)',
                            color: 'white',
                            fontWeight: 700,
                            boxShadow: '0 0 14px -2px oklch(0.6 0.19 265 / 0.7)'
                        } : undefined}
                    >
                        One-time
                    </button>
                    <button
                        className="glass-segment-option glass-segment-toggle"
                        onClick={() => setScheduleType('recurring')}
                        style={scheduleType === 'recurring' ? {
                            background: 'oklch(0.6 0.19 265)',
                            color: 'white',
                            fontWeight: 700,
                            boxShadow: '0 0 14px -2px oklch(0.6 0.19 265 / 0.7)'
                        } : undefined}
                    >
                        Recurring
                    </button>
                </div>
            </div>

            {scheduleType === 'one-time' && (
                <div className="glass-field">
                    <label className="glass-label">Date</label>
                    <input
                        className="glass-input"
                        type="date"
                        value={date}
                        min={today}
                        onChange={e => setDate(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>
            )}

            {scheduleType === 'recurring' && (
                <div className="glass-field">
                    <label className="glass-label">Days</label>
                    <div className="glass-pill-row">
                        {PRESETS.map(preset => (
                            <button key={preset.label}
                                className={isPresetActive(preset.days) ? 'glass-pill glass-pill-active' : 'glass-pill'}
                                onClick={() => setSelectedDays(preset.days)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <div className="glass-day-row">
                        {DAYS.map(day => (
                            <button key={day.value}
                                className={selectedDays.includes(day.value) ? 'glass-day glass-day-active' : 'glass-day'}
                                onClick={() => toggleDay(day.value)}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
            {success && <p className="glass-success-text">{success}</p>}

            <button className="add-website-btn" onClick={handleBlock} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Blocking...' : 'Block Category'}
            </button>
        </div>
    );
}

export default CategoryBlock;
