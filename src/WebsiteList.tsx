import { useState, useEffect } from 'react';
import ConfirmPhrase from './ConfirmPhrase.tsx';

interface Website {
    _id: string;
    url: string;
    dateCreated: string;
    startTime: string;
    endTime: string;
    strictMode: boolean | null;
}

const isActivelyBlocking = (websites: any[], recurringBlocks: any[]) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentDay = now.getDay();

    const oneTimeActive = websites.some(site => {
        const siteDate = site.dateCreated.split('T')[0];
        return siteDate === currentDate &&
            currentTime >= site.startTime &&
            currentTime <= site.endTime;
    });

    if (oneTimeActive) return true;

    return recurringBlocks.some(block =>
        block.active &&
        block.days.includes(currentDay) &&
        currentTime >= block.startTime &&
        currentTime <= block.endTime 
    );
};

function WebsiteList() {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<Website, '_id'>>({ url: '', dateCreated: '', startTime: '', endTime: '', strictMode: null});
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [strictMode, setStrictMode] = useState(false);
    const [isStrictMode, setIsStrictMode] = useState(false);
    const [plan, setPlan] = useState<string>('free');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const result = await chrome.storage.local.get(['token', 'strictMode', 'plan']);
            const token = result.token as string;
            const cachedPlan = result.plan as string | undefined;

            setStrictMode((result.strictMode as boolean) ?? false);
            setPlan(cachedPlan || 'free');

            if (!token) return;

            const planRes = await fetch('https://www.deeplockin.com/api/user/plan', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const planData = await planRes.json();

            if (planData.plan !== cachedPlan) {
                await chrome.storage.local.set({ plan: planData.plan });
                setPlan(planData.plan);
            }

            const response = await fetch('https://www.deeplockin.com/api/websites', {
                headers: { 'authorization': `Bearer ${token}`}
            });

            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const data = await response.json();
            setWebsites(data);
            chrome.storage.local.set({ websites: data });
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchWebsites = async () => {
            const { token } = await chrome.storage.local.get('token');

            if (!token) {
                console.error('No userId found');
                return;
            }

            const response = await fetch('https://www.deeplockin.com/api/websites', {
                headers: {
                    'authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const data = await response.json();
            setWebsites(data);
            chrome.storage.local.set({ websites: data });
        };
        fetchWebsites();
    }, []);

    useEffect(() => {
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.websites?.newValue) {
                setWebsites(changes.websites.newValue as Website[]);
            }
            if (changes.strictMode?.newValue !== undefined) {
                setStrictMode(changes.strictMode.newValue as boolean);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    useEffect(() => {
        const checkExpired = async () => {
            const now = new Date();
            const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const expired = websites.filter(site => {
                const siteDate = site.dateCreated.split('T')[0];
                return siteDate < currentDate ||
                    (siteDate === currentDate && site.endTime < currentTime);
            });

            if (expired.length === 0) return;

            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

            for (const site of expired) {
                try {
                    await fetch(`https://www.deeplockin.com/api/websites/${site._id}`, {
                        method: 'DELETE',
                        headers: { 'authorization': `Bearer ${token}` }
                    });
                } catch (err) {
                    console.error('Failed to delete expired site:', err);
                }
            }

            const remaining = websites.filter(site => {
                const siteDate = site.dateCreated.split('T')[0];
                return !(siteDate < currentDate || 
                    (siteDate === currentDate && site.endTime < currentTime)
                );
            });

            setWebsites(remaining);
            await chrome.storage.local.set({ websites: remaining });
        };

        checkExpired();

        const interval = setInterval(checkExpired, 30000);
        return () => clearInterval(interval);
    }, [websites]);

    const getEffectiveStrictMode = (site: any, globalStrictMode: boolean) => {
        if (site.strictMode !== null && site.strictMode !== undefined) {
            return site.strictMode;
        }
        return globalStrictMode;
    }

    const startEditing = (site: Website) => {
        setEditingId(site._id);
        setEditForm({ url: site.url, dateCreated: site.dateCreated ? site.dateCreated.split('T')[0] : '', startTime: site.startTime, endTime: site.endTime, strictMode: site.strictMode });
    };

    const saveEdit = async (id: string) => {
        if (!editForm.url || !editForm.dateCreated || !editForm.startTime || !editForm.endTime) {
            alert('Please fill in all fields');
            return;
        }

        if (editForm.endTime <= editForm.startTime) {
            alert('End time must be after start time');
            return;
        }

        if (editForm.startTime < currentTime) {
            alert('This time has already passed');
            return;
        }

        try {
            const { token } = await chrome.storage.local.get('token');

            if (!token) {
                console.error('No userId found');
                return;
            }

            const response = await fetch(`https://www.deeplockin.com/api/websites/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });

            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const updatedSite = await response.json();
            const updated = websites.map((site) => site._id === id ? updatedSite : site);
            setWebsites(updated);
            chrome.storage.local.set({ websites: updated });
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteClick = async (id: string) => {
        if (plan === 'pro') {
            const result = await chrome.storage.local.get(['websites', 'recurringBlocks']);
            const freshWebsites = (result.websites as any[]) || [];
            const blocking = isActivelyBlocking(freshWebsites, (result.recurringBlocks as any[]) || []);

            if (blocking) {
                const site = websites.find(s => s._id === id);
                const effective = site ? getEffectiveStrictMode(site, strictMode) : strictMode;
                setIsStrictMode(effective);
                setPendingDeleteId(id);
                setShowConfirm(true);
                return;
            }
        }
        deleteWebsite(id);
    };

    const deleteWebsite = async (id: string) => {
        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;
            
            await fetch(`https://www.deeplockin.com/api/websites/${id}`, {
                method: 'DELETE',
                headers: {
                    'authorization': `Bearer ${token}`
                }
            });

            const updated = websites.filter((site) => site._id !== id);
            setWebsites(updated);
            chrome.storage.local.set({ websites: updated });
        } catch (err) {
            console.error(err);
        }
    };

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return (
        <div className="website-list">
            {websites.map((site) => (
                <div key={site._id} className="site-card">
                    <div className="site-card-header" onClick={() => setExpandedId(expandedId === site._id ? null : site._id)}>
                        <span className="site-card-name">
                            {site.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}
                        </span>
                        <span className="site-dropdown-chevron">
                            {expandedId === site._id ? '▲' : '▼'}
                        </span>
                    </div>

                    {expandedId === site._id && (
                        <div className="site-card-body">
                            {editingId === site._id ? (
                                <>
                                    <input className="glass-input" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="URL" style={{ width: '100%', marginTop: 12, boxSizing: 'border-box' as const }} />
                                    <input className="glass-input" type="date" value={editForm.dateCreated ? editForm.dateCreated.split('T')[0] : ''} min={today} onChange={(e) => setEditForm({ ...editForm, dateCreated: e.target.value })} style={{ width: '100%', marginTop: 8, boxSizing: 'border-box' as const }} />
                                    <div className="glass-row" style={{ marginTop: 8 }}>
                                        <input className="glass-input" type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
                                        <span>to</span>
                                        <input className="glass-input" type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
                                    </div>
                                    {plan === 'pro' && (
                                        <div className="glass-segment" style={{ marginTop: 8 }}>
                                            {[
                                                { label: 'Default', value: null, color: 'oklch(0.6 0.19 265)' },
                                                { label: 'On', value: true, color: '#ff4d4d' },
                                                { label: 'Off', value: false, color: '#4CAF50' }
                                            ].map(opt => (
                                                <button key={opt.label}
                                                    className="glass-segment-option"
                                                    onClick={() => setEditForm({ ...editForm, strictMode: opt.value })}
                                                    style={editForm.strictMode === opt.value ? {
                                                        background: opt.color,
                                                        color: 'white',
                                                        fontWeight: 700,
                                                        boxShadow: `0 0 14px -2px ${opt.color}`
                                                    } : undefined}
                                                >{opt.label}</button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="site-btn-row" style={{ marginTop: 10 }}>
                                        <button className="site-btn site-btn-primary" onClick={() => saveEdit(site._id)}>Save</button>
                                        <button className="site-btn" onClick={() => setEditingId(null)}>Cancel</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="site-detail-row">
                                        <div>
                                            <span className="site-detail-label">Date </span>
                                            <span className="site-detail-value">{site.dateCreated.split('T')[0]}</span>
                                        </div>
                                        <div>
                                            <span className="site-detail-label">Time </span>
                                            <span className="site-detail-value-accent">{site.startTime} – {site.endTime}</span>
                                        </div>
                                    </div>
                                    <div className="site-btn-row">
                                        <button className="site-btn" onClick={() => startEditing(site)}>Edit</button>
                                        <button className="site-btn site-btn-danger" onClick={() => handleDeleteClick(site._id)}>Delete</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}
            {showConfirm && (
                <ConfirmPhrase action="delete this block" strictMode={isStrictMode} onConfirm={() => {
                    if (pendingDeleteId) deleteWebsite(pendingDeleteId);
                    setShowConfirm(false);
                    setPendingDeleteId(null);
                }}
                onCancel={() => {
                    setShowConfirm(false);
                    setPendingDeleteId(null);
                }}
                />
            )}
        </div>
    );
}

export default WebsiteList; 