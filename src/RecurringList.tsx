import { useState, useEffect, useRef } from 'react';
import ConfirmPhrase from './ConfirmPhrase.tsx';

interface RecurringBlock {
    _id: string;
    url: string;
    startTime: string;
    endTime: string;
    days: number[];
    active: boolean;
    strictMode: boolean | null;
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

const isActivelyBlocking = (recurringBlocks: RecurringBlock[]) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay();

    return recurringBlocks.some(block =>
        block.active && 
        block.days.includes(currentDay) &&
        currentTime >= block.startTime && 
        currentTime <= block.endTime 
    );
};

function RecurringList() {
    const [blocks, setBlocks] = useState<RecurringBlock[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<RecurringBlock, '_id'>>({
        url: '',
        startTime: '',
        endTime: '',
        days: [],
        active: true,
        strictMode: null 
    });
    const strictModeRef = useRef(false);


    useEffect(() => {
        const fetchBlocks = async () => {
            const result = await chrome.storage.local.get(['token', 'strictMode']);
            const token = result.token as string;
            const sm = (result.strictMode as boolean) ?? false;
            strictModeRef.current = sm;

            const response = await fetch('https://lockedin-web-six.vercel.app/api/recurring', {
                headers: { 'authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                setBlocks(data);
                await chrome.storage.local.set({ recurringBlocks: data });
            }
        };
        fetchBlocks();
    }, []);

    const requiredConfirmIfBlocking = async (action: () => void) => {
        if (isActivelyBlocking(blocks)) {
            const result = await chrome.storage.local.get('strictMode');
            const sm = (result.strictMode as boolean) ?? false;
            strictModeRef.current = sm;
            setPendingAction(() => action);
            setShowConfirm(true);
        } else {
            action();
        }
    };

    const startEditing = (block: RecurringBlock) => {
        setEditingId(block._id);
        setEditForm({
            url: block.url,
            startTime: block.startTime,
            endTime: block.endTime,
            days: block.days,
            active: block.active,
            strictMode: block.strictMode 
        });
    };

    const toggleEditDay = (day: number) => {
        setEditForm(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const saveEdit = async (id: string) => {
        if (!editForm.url || !editForm.startTime || !editForm.endTime || editForm.days.length === 0) {
            alert('Please fill in all fields and select at least one day');
            return;
        }
        if (editForm.endTime <= editForm.startTime) {
            alert('End time must be after start time');
            return;
        }

        const result = await chrome.storage.local.get('token');
        const token = result.token as string;

        const response = await fetch(`https://lockedin-web-six.vercel.app/api/recurring/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify(editForm)
        });

        if (response.ok) {
            const updated = blocks.map(b => b._id === id ? { ...b, ...editForm } : b);
            setBlocks(updated);
            await chrome.storage.local.set({ recurringBlocks: updated });
            setEditingId(null);
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;

        const response = await fetch(`https://lockedin-web-six.vercel.app/api/recurring/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ active: !current })
        });

        if (response.ok) {
            const updated = blocks.map(b => b._id === id ? { ...b, active: !current } : b);
            setBlocks(updated);
            await chrome.storage.local.set({ recurringBlocks: updated });
        }
    };

    const deleteBlock = async (id: string) => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;

        const response = await fetch(`https://lockedin-web-six.vercel.app/api/recurring/${id}`, {
            method: 'DELETE',
            headers: { 'authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const updated = blocks.filter(b => b._id !== id);
            setBlocks(updated);
            await chrome.storage.local.set({ recurringBlocks: updated });
        }
    };

    if (blocks.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255, 255, 255, 0.4)' }}>
                <p>No recurring blocks yet</p>
            </div>
        );
    }

    return (
        <>
            <div className="website-list">
                {blocks.map(block => (
                    <div className="website-card" key={block._id} style={{ opacity: block.active ? 1 : 0.5, height: 'auto', padding: '6px 8px' }}>
                        {editingId === block._id ? (
                            <>
                                <input
                                    style={{ background: 'rgb(5,5,53)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '4px 8px', fontSize: 12, width: '100%' }}
                                    value={editForm.url}
                                    onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                                    placeholder="URL"
                                />

                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {PRESETS.map(preset => (
                                        <button
                                            key={preset.label}
                                            onClick={() => setEditForm({ ...editForm, days: preset.days })}
                                            style={{
                                                padding: '3px 8px',
                                                borderRadius: 20,
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                background: JSON.stringify(editForm.days.slice().sort()) === JSON.stringify([...preset.days].sort())
                                                    ? '#0099ff'
                                                    : 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: 10,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: 4 }}>
                                    {DAYS.map(day => (
                                        <button
                                            key={day.value}
                                            onClick={() => toggleEditDay(day.value)}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: '50%',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                background: editForm.days.includes(day.value)
                                                    ? '#0099ff'
                                                    : 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: 10,
                                                cursor: 'pointer',
                                                fontWeight: editForm.days.includes(day.value) ? 700 : 400
                                            }}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input
                                        type="time"
                                        value={editForm.startTime}
                                        onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                                        style={{ background: 'rgb(5,5,53)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '4px', fontSize: 11, flex: 1 }}
                                    />
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>to</span>
                                    <input
                                        type="time"
                                        value={editForm.endTime}
                                        onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                                        style={{ background: 'rgb(5,5,53)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '4px', fontSize: 11, flex: 1 }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Strict:</span>
                                    {[
                                        { label: 'Default', value: null, color: '#0099ff' },
                                        { label: 'On', value: true, color: '#ff4d4d' },
                                        { label: 'Off', value: false, color: '#4CAF50' }
                                    ].map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setEditForm({ ...editForm, strictMode: opt.value })}
                                            style={{
                                                padding: '2px 7px',
                                                borderRadius: 20,
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                background: editForm.strictMode === opt.value ? opt.color : 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: 10,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    <button
                                        className="edit-button"
                                        style={{ padding: '4px 10px', fontSize: 11 }}
                                        onClick={() => saveEdit(block._id)}
                                    >
                                        Save
                                    </button>
                                    <button
                                        className="delete-button"
                                        style={{ padding: '4px 10px', fontSize: 11 }}
                                        onClick={() => setEditingId(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="card-url" style={{ fontSize: 12 }}>{block.url}</h3>
                                <div className="card-info" style={{ fontSize: 11, gap: 2 }}>
                                    <p style={{ margin: 0 }}>
                                        <span>Days: </span>{block.days.sort().map(d => DAY_LABELS[d]).join(', ')}
                                    </p> 
                                    <p style={{ margin: 0 }}>
                                        <span>Time: </span>{block.startTime}–{block.endTime}
                                    </p>
                                    <p style={{ margin: 0 }}>
                                        <span>Status: </span>{block.active ? 'Active' : 'Paused'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    <button
                                        className="edit-button"
                                        style={{ padding: '4px 10px', fontSize: 11 }}
                                        onClick={() => startEditing(block)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="edit-button"
                                        style={{ padding: '4px 10px', fontSize: 11 }}
                                        onClick={async () => await requiredConfirmIfBlocking(() => toggleActive(block._id, block.active))}
                                    >
                                        {block.active ? 'Pause' : 'Resume'}
                                    </button>
                                    <button
                                        className="delete-button"
                                        style={{ padding: '4px 10px', fontSize: 11 }}
                                        onClick={async () => await requiredConfirmIfBlocking(() => deleteBlock(block._id))}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {showConfirm && (
                <ConfirmPhrase
                    action="modify a recurring block"
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

export default RecurringList;