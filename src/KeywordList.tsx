import { useState, useEffect, useRef } from 'react';
import ConfirmPhrase from './ConfirmPhrase.tsx';

interface KeywordBlock {
    _id: string;
    keyword: string;
    startTime: string;
    endTime: string;
    days: number[];
    strictMode: boolean | null;
    createdAt: string;
}

interface KeywordListProps {
    onCountChange?: (count: number) => void;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

const STRICT_OPTIONS: { label: string; value: boolean | null; color: string }[] = [
    { label: 'Default', value: null, color: 'oklch(0.6 0.19 265)' },
    { label: 'On', value: true, color: '#ff4d4d' },
    { label: 'Off', value: false, color: '#4CAF50' }
];

const isActivelyBlocking = (keywords: KeywordBlock[]) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay();

    return keywords.some(block =>
        block.days.includes(currentDay) &&
        currentTime >= block.startTime &&
        currentTime <= block.endTime
    );
};

const getEffectiveStrictMode = (block: KeywordBlock, globalStrictMode: boolean) => {
    if (block.strictMode !== null && block.strictMode !== undefined) {
        return block.strictMode;
    }
    return globalStrictMode;
};

function KeywordList({ onCountChange }: KeywordListProps) {
    const [keywords, setKeywords] = useState<KeywordBlock[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const strictModeRef = useRef(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<KeywordBlock, '_id' | 'keyword' | 'createdAt'>>({
        startTime: '',
        endTime: '',
        days: [],
        strictMode: null
    });

    useEffect(() => {
        const fetchKeywords = async () => {
            const result = await chrome.storage.local.get(['token', 'strictMode']);
            const token = result.token as string;
            strictModeRef.current = (result.strictMode as boolean) ?? false;

            const response = await fetch('https://www.deeplockin.com/api/keywords', {
                headers: { 'authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                setKeywords(data);
                await chrome.storage.local.set({ keywordBlocks: data });
            }
        };
        fetchKeywords();
    }, []);

    useEffect(() => {
        onCountChange?.(keywords.length);
    }, [keywords, onCountChange]);

    const toggleEditDay = (day: number) => {
        setEditForm(prev => ({
            ...prev,
            days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
        }));
    };

    const requiredConfirmIfBlocking = async (block: KeywordBlock, action: () => void) => {
        if (isActivelyBlocking(keywords)) {
            const result = await chrome.storage.local.get('strictMode');
            const sm = (result.strictMode as boolean) ?? false;
            strictModeRef.current = getEffectiveStrictMode(block, sm);
            setPendingAction(() => action);
            setShowConfirm(true);
        } else {
            action();
        }
    };

    const startEditing = (block: KeywordBlock) => {
        setEditingId(block._id);
        setEditForm({
            startTime: block.startTime,
            endTime: block.endTime,
            days: block.days,
            strictMode: block.strictMode
        });
    };

    const saveEdit = async (id: string) => {
        if (!editForm.startTime || !editForm.endTime || editForm.days.length === 0) {
            alert('Please fill in all fields and select at least one day');
            return;
        }
        if (editForm.endTime <= editForm.startTime) {
            alert('End time must be after start time');
            return;
        }

        const result = await chrome.storage.local.get('token');
        const token = result.token as string;

        const response = await fetch(`https://www.deeplockin.com/api/keywords/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify(editForm)
        });

        if (response.ok) {
            const updated = keywords.map(k => k._id === id ? { ...k, ...editForm } : k);
            setKeywords(updated);
            await chrome.storage.local.set({ keywordBlocks: updated });
            setEditingId(null);
        }
    };

    const deleteKeyword = async (id: string) => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;

        const response = await fetch(`https://www.deeplockin.com/api/keywords/${id}`, {
            method: 'DELETE',
            headers: { 'authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const updated = keywords.filter(k => k._id !== id);
            setKeywords(updated);
            await chrome.storage.local.set({ keywordBlocks: updated });
        }
    };

    return (
        <>
            <div className="website-list" style={{ marginTop: 8 }}>
                {keywords.length === 0 ? (
                    <p className="site-blocks-note" style={{ textAlign: 'center', margin: '12px 0 0', color: 'white' }}>
                        No keywords yet — any URL containing your keyword will be blocked during its scheduled window
                    </p>
                ) : (
                    keywords.map(block => (
                        <div key={block._id} className="site-card">
                            <div
                                className="site-card-header"
                                onClick={() => setExpandedId(expandedId === block._id ? null : block._id)}
                            >
                                <span className="site-card-name">🔑 {block.keyword}</span>
                                <span className="site-dropdown-chevron">
                                    {expandedId === block._id ? '▲' : '▼'}
                                </span>
                            </div>

                            {expandedId === block._id && (
                                <div className="site-card-body">
                                    {editingId === block._id ? (
                                        <>
                                            <div className="glass-pill-row" style={{ marginTop: 8 }}>
                                                {PRESETS.map(preset => (
                                                    <button
                                                        key={preset.label}
                                                        className={JSON.stringify(editForm.days.slice().sort()) === JSON.stringify([...preset.days].sort()) ? 'glass-pill glass-pill-active' : 'glass-pill'}
                                                        onClick={() => setEditForm({ ...editForm, days: preset.days })}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="glass-day-row">
                                                {DAYS.map(day => (
                                                    <button
                                                        key={day.value}
                                                        className={editForm.days.includes(day.value) ? 'glass-day glass-day-active' : 'glass-day'}
                                                        onClick={() => toggleEditDay(day.value)}
                                                    >
                                                        {day.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="glass-row" style={{ marginTop: 8 }}>
                                                <input
                                                    className="glass-input"
                                                    type="time"
                                                    value={editForm.startTime}
                                                    onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                                                    style={{ flex: 1, minWidth: 0 }}
                                                />
                                                <span>to</span>
                                                <input
                                                    className="glass-input"
                                                    type="time"
                                                    value={editForm.endTime}
                                                    onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                                                    style={{ flex: 1, minWidth: 0 }}
                                                />
                                            </div>

                                            <div className="glass-segment" style={{ marginTop: 8 }}>
                                                {STRICT_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.label}
                                                        className="glass-segment-option"
                                                        onClick={() => setEditForm({ ...editForm, strictMode: opt.value })}
                                                        style={editForm.strictMode === opt.value ? {
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

                                            <div className="site-btn-row" style={{ marginTop: 10 }}>
                                                <button className="site-btn site-btn-primary" onClick={() => saveEdit(block._id)}>Save</button>
                                                <button className="site-btn" onClick={() => setEditingId(null)}>Cancel</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="site-detail-row">
                                                <div>
                                                    <span className="site-detail-label">Days </span>
                                                    <span className="site-detail-value">{block.days.slice().sort().map(d => DAY_LABELS[d]).join(', ')}</span>
                                                </div>
                                                <div>
                                                    <span className="site-detail-label">Time </span>
                                                    <span className="site-detail-value-accent">{block.startTime} – {block.endTime}</span>
                                                </div>
                                            </div>
                                            <div className="site-btn-row" style={{ marginTop: 10 }}>
                                                <button className="site-btn" onClick={() => startEditing(block)}>Edit</button>
                                                <button
                                                    className="site-btn site-btn-danger"
                                                    onClick={async () => await requiredConfirmIfBlocking(block, () => deleteKeyword(block._id))}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {showConfirm && (
                <ConfirmPhrase
                    action="modify a keyword block"
                    strictMode={strictModeRef.current}
                    onConfirm={() => {
                        if (pendingAction) pendingAction();
                        setShowConfirm(false);
                        setPendingAction(null);
                    }}
                    onCancel={() => {
                        setShowConfirm(false);
                        setPendingAction(null);
                    }}
                />
            )}
        </>
    );
}

export default KeywordList;
