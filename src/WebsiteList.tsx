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
                <div key={site._id} className="list-item-card">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        cursor: 'pointer'
                    }} onClick={() => setExpandedId(expandedId === site._id ? null : site._id)}
                    >
                        <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>
                            {site.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}
                        </span>
                        <span style={{ color: 'rgba(150, 210, 255, 0.6)', fontSize: 11 }}>
                            {expandedId === site._id ? '▲' : '▼'}
                        </span>
                    </div>

                    {expandedId === site._id && (
                        <div style={{ padding: '0 10px 10px', borderTop: '1px solid rgba(0, 170, 255, 0.15)' }}>
                            {editingId === site._id ? (
                                <>
                                    <input id="editurl" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="URL" style={{ width: '100%', marginTop: 8, boxSizing: 'border-box' as const }} />
                                    <input id="editdate" type="date" value={editForm.dateCreated ? editForm.dateCreated.split('T')[0] : ''} min={today} onChange={(e) => setEditForm({ ...editForm, dateCreated: e.target.value })} style={{ width: '100%', marginTop: 6, boxSizing: 'border-box' as const }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                        <input id="editstart" type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} style={{ flex: 1 }} />
                                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}>to</span>
                                        <input id="editend" type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} style={{ flex: 1 }} />
                                    </div>
                                    {plan === 'pro' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}>Strict:</span>
                                            {[
                                                { label: 'Default', value: null, color: '#0099ff' },
                                                { label: 'On', value: true, color: '#ff4d4d' },
                                                { label: 'Off', value: false, color: '#4CAF50' }
                                            ].map(opt => (
                                                <button key={opt.label}
                                                    className={editForm.strictMode === opt.value ? 'pill pill-active' : 'pill'}
                                                    onClick={() => setEditForm({ ...editForm, strictMode: opt.value })}
                                                    style={{
                                                        padding: '2px 7px',
                                                        background: editForm.strictMode === opt.value ? opt.color : undefined,
                                                        borderColor: editForm.strictMode === opt.value ? opt.color : undefined,
                                                        fontSize: 10
                                                    }}
                                                >{opt.label}</button>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button className="edit-button" style={{ flex: 1, fontSize: 11 }} onClick={() => saveEdit(site._id)}>Save</button>
                                        <button className="delete-button" style={{ flex: 1, fontSize: 11 }} onClick={() => setEditingId(null)}>Cancel</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, margin: 0 }}>
                                            <span style={{ color: 'white', fontWeight: 600 }}>Date: </span>
                                            {site.dateCreated.split('T')[0]}
                                        </p>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, margin: 0 }}>
                                            <span style={{ color: 'white', fontWeight: 600 }}>Time: </span>
                                            {site.startTime} - {site.endTime}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button className="edit-button" style={{ flex: 1, fontSize: 11 }} onClick={() => startEditing(site)}>Edit</button>
                                        <button className="delete-button" style={{ flex: 1, fontSize: 11 }} onClick={() => handleDeleteClick(site._id)}>Delete</button>
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