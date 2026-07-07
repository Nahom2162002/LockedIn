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
        <div className="sitechoicebackground">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button key={key}
                        className={selectedCategory === key ? 'pill pill-active' : 'pill'}
                        onClick={() => setSelectedCategory(key)}
                        style={{ padding: '6px 10px',
                        background: selectedCategory === key ? '#0099ff' : undefined,
                        fontSize: 11,
                        fontWeight: selectedCategory === key ? 700 : 400
                    }}
                    >
                        {cat.emoji} {cat.label}
                    </button>
                ))}
            </div>
            {selectedCategory && (
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, margin: '4px 0' }}>
                    Blocks: {CATEGORIES[selectedCategory].urls.slice(0, 4).join(', ')}
                    {CATEGORIES[selectedCategory].urls.length > 4 && ` +${CATEGORIES[selectedCategory].urls.length - 4} more`}
                </p>
            )}

            <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
                <button
                    className={scheduleType === 'one-time' ? 'pill pill-active' : 'pill'}
                    onClick={() => setScheduleType('one-time')} style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 8,
                    background: scheduleType === 'one-time' ? '#0099ff' : undefined,
                    fontSize: 11
                }}
                >
                    One-time
                </button>
                <button
                    className={scheduleType === 'recurring' ? 'pill pill-active' : 'pill'}
                    onClick={() => setScheduleType('recurring')} style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 8,
                    background: scheduleType === 'recurring' ? '#0099ff' : undefined,
                    fontSize: 11
                }}
                >
                    Recurring
                </button>
            </div>
            {scheduleType === 'one-time' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '8px 0' }}>
                    <p id="time" style={{ position: 'fixed', top: '39%' }}>Date:</p>
                    <input id="datetext" type="date" value={date} min={today} onChange={e => setDate(e.target.value)}/>
                </div>
            )}
            {scheduleType === 'recurring' && (
                <>
                    <div style={{ display: 'flex', gap: 6, margin: '4px 0' }}>
                        {PRESETS.map(preset => (
                            <button key={preset.label}
                                className={JSON.stringify(selectedDays.sort()) === JSON.stringify([...preset.days].sort()) ? 'pill pill-active' : 'pill'}
                                onClick={() => setSelectedDays(preset.days)} style={{
                                padding: '4px 8px',
                                background: JSON.stringify(selectedDays.sort()) === JSON.stringify([...preset.days].sort())
                                    ? '#0099ff'
                                    : undefined,
                                fontSize: 10
                            }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, margin: '4px 0' }}>
                        {DAYS.map(day => (
                            <button key={day.value}
                            className={selectedDays.includes(day.value) ? 'pill pill-active' : 'pill'}
                            onClick={() => toggleDay(day.value)}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: selectedDays.includes(day.value)
                                    ? '#0099ff'
                                    : undefined,
                                fontSize: 10,
                                fontWeight: selectedDays.includes(day.value) ? 700 : 400
                            }}
                            >
                                {day.label}
                        </button>
                        ))}
                    </div>
                </>
            )}

            <p style={{ position: 'fixed', top: '58%', right: '82%', color: 'white', fontWeight: 'bold' }}>Time:</p>
            <div style={{ position: 'fixed', top: '60%', left: '20%', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="starttime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ position: 'static' }}/>
                <span style={{ color: 'white' }}>to</span>
                <input id="endtime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ position: 'static' }}/>
            </div>
            
            {error && <p className="error-message">{error}</p>}
            {success && <p style={{ color: '#4CAF50', fontSize: 12, textAlign: 'center' }}>{success}</p>}

            <button className="addbutton" onClick={handleBlock} disabled={loading}>
                {loading ? 'Blocking...' : 'Block Category'}
            </button>
            <button id="xbutton" onClick={onClose}>X</button>
        </div>
    );
}

export default CategoryBlock;