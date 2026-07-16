import { useState, useEffect, useRef } from 'react';
import ConfirmPhrase from './ConfirmPhrase.tsx';
import { matchCategory, type MatchedCategory } from './matchCategory';

interface RecurringBlock {
    _id: string;
    url: string;
    startTime: string;
    endTime: string;
    days: number[];
    active: boolean;
    strictMode: boolean | null;
}

interface BlockGroup {
    id: string;
    blocks: RecurringBlock[];
    category: MatchedCategory | null;
}

const groupBlocks = (blocks: RecurringBlock[]): BlockGroup[] => {
    const bySignature = new Map<string, RecurringBlock[]>();
    for (const block of blocks) {
        const sig = `${block.days.slice().sort().join(',')}|${block.startTime}|${block.endTime}|${block.strictMode}|${block.active}`;
        const existing = bySignature.get(sig);
        if (existing) existing.push(block);
        else bySignature.set(sig, [block]);
    }

    const groups: BlockGroup[] = [];
    for (const [sig, blocksInGroup] of bySignature) {
        const category = blocksInGroup.length > 1 ? matchCategory(blocksInGroup.map(b => b.url)) : null;
        if (category) {
            groups.push({ id: sig, blocks: blocksInGroup, category });
        } else {
            for (const block of blocksInGroup) {
                groups.push({ id: block._id, blocks: [block], category: null });
            }
        }
    }
    return groups;
};

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
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchBlocks = async () => {
            const result = await chrome.storage.local.get(['token', 'strictMode']);
            const token = result.token as string;
            const sm = (result.strictMode as boolean) ?? false;
            strictModeRef.current = sm;

            const response = await fetch('https://www.deeplockin.com/api/recurring', {
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

    const getEffectiveStrictMode = (block: RecurringBlock, globalStrictMode: boolean) => {
        if (block.strictMode !== null && block.strictMode !== undefined) {
            return block.strictMode;
        }
        return globalStrictMode;
    };

    const requiredConfirmIfBlocking = async (block: RecurringBlock, action: () => void) => {
        if (isActivelyBlocking(blocks)) {
            const result = await chrome.storage.local.get('strictMode');
            const sm = (result.strictMode as boolean) ?? false;
            strictModeRef.current = getEffectiveStrictMode(block, sm);
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

    const startEditingGroup = (group: BlockGroup) => {
        const block = group.blocks[0];
        setEditingId(group.id);
        setEditForm({
            url: '',
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

        const response = await fetch(`https://www.deeplockin.com/api/recurring/${id}`, {
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

    const saveGroupEdit = async (ids: string[]) => {
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

        const results = await Promise.all(ids.map(id => fetch(`https://www.deeplockin.com/api/recurring/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                startTime: editForm.startTime,
                endTime: editForm.endTime,
                days: editForm.days,
                strictMode: editForm.strictMode
            })
        })));

        if (results.every(r => r.ok)) {
            const updated = blocks.map(b => ids.includes(b._id)
                ? { ...b, startTime: editForm.startTime, endTime: editForm.endTime, days: editForm.days, strictMode: editForm.strictMode }
                : b);
            setBlocks(updated);
            await chrome.storage.local.set({ recurringBlocks: updated });
            setEditingId(null);
        }
    };

    const toggleActiveGroup = async (ids: string[], current: boolean) => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;

        const results = await Promise.all(ids.map(id => fetch(`https://www.deeplockin.com/api/recurring/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ active: !current })
        })));

        if (results.every(r => r.ok)) {
            const updated = blocks.map(b => ids.includes(b._id) ? { ...b, active: !current } : b);
            setBlocks(updated);
            await chrome.storage.local.set({ recurringBlocks: updated });
        }
    };

    const deleteBlockGroup = async (ids: string[]) => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;

        const results = await Promise.all(ids.map(id => fetch(`https://www.deeplockin.com/api/recurring/${id}`, {
            method: 'DELETE',
            headers: { 'authorization': `Bearer ${token}` }
        })));

        if (results.every(r => r.ok)) {
            const updated = blocks.filter(b => !ids.includes(b._id));
            setBlocks(updated);
            await chrome.storage.local.set({ recurringBlocks: updated });
        }
    };

    const groups = groupBlocks(blocks);

    return (
        <>
            <div className="website-list">
                {groups.map(group => {
                    const block = group.blocks[0];
                    const isCategory = group.category !== null;
                    const ids = group.blocks.map(b => b._id);

                    return (
                        <div key={group.id} className="site-card" style={{
                            opacity: block.active ? 1 : 0.5
                        }}>

                            <div className="site-card-header" onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}>
                                <span className="site-card-name">
                                    {isCategory
                                        ? `${group.category!.emoji} ${group.category!.label}`
                                        : block.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}
                                </span>
                                <div className="site-card-header-right">
                                    <span className={block.active ? 'site-status-dot site-status-dot-active' : 'site-status-dot site-status-dot-paused'} />
                                    <span className="site-dropdown-chevron">
                                        {expandedId === group.id ? '▲' : '▼'}
                                    </span>
                                </div>
                            </div>

                            {expandedId === group.id && (
                                <div className="site-card-body">
                                    {editingId === group.id ? (
                                        <>
                                            {!isCategory && (
                                                <input
                                                    className="glass-input"
                                                    value={editForm.url}
                                                    onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                                                    placeholder="URL"
                                                    style={{ width: '100%', marginTop: 12, boxSizing: 'border-box' as const }}
                                                />
                                            )}

                                            <div className="glass-pill-row" style={{ marginTop: isCategory ? 12 : 8 }}>
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
                                                {[
                                                    { label: 'Default', value: null, color: 'oklch(0.6 0.19 265)' },
                                                    { label: 'On', value: true, color: '#ff4d4d' },
                                                    { label: 'Off', value: false, color: '#4CAF50' }
                                                ].map(opt => (
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
                                                <button className="site-btn site-btn-primary" onClick={() => isCategory ? saveGroupEdit(ids) : saveEdit(block._id)}>Save</button>
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
                                                <div>
                                                    <span className="site-detail-label">Status </span>
                                                    <span className={block.active ? 'site-detail-value-active' : 'site-detail-value'}>
                                                        {block.active ? '● Active' : '⏸ Paused'}
                                                    </span>
                                                </div>
                                            </div>
                                            {isCategory && (
                                                <p className="site-blocks-note">
                                                    Blocks: {group.blocks.slice(0, 4).map(b => b.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]).join(', ')}
                                                    {group.blocks.length > 4 && ` +${group.blocks.length - 4} more`}
                                                </p>
                                            )}
                                            <div className="site-btn-row" style={{ marginTop: isCategory ? 10 : 0 }}>
                                                <button
                                                    className="site-btn"
                                                    onClick={() => isCategory ? startEditingGroup(group) : startEditing(block)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="site-btn"
                                                    onClick={async () => await requiredConfirmIfBlocking(block, () => toggleActiveGroup(ids, block.active))}
                                                >
                                                    {block.active ? 'Pause' : 'Resume'}
                                                </button>
                                                <button
                                                    className="site-btn site-btn-danger"
                                                    onClick={async () => await requiredConfirmIfBlocking(block, () => deleteBlockGroup(ids))}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
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