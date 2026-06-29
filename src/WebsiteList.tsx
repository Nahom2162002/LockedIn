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
    const [recurringBlocks, setRecurringBlocks] = useState<any[]>([]);
    const [strictMode, setStrictMode] = useState(false);
    const [isStrictMode, setIsStrictMode] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const result = await chrome.storage.local.get(['token', 'recurringBlocks', 'strictMode']);
            const token = result.token as string;
            const cached = (result.recurringBlocks as any[]) || [];
            setRecurringBlocks(cached);
            setStrictMode((result.strictMode as boolean) ?? false);

            if (!token) return;

            const response = await fetch('https://lockedin-web-six.vercel.app/api/websites', {
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
            //const response = await fetch(`https://lockedin-jovk.onrender.com/websites?userId=${userId}`);
            const response = await fetch('https://lockedin-web-six.vercel.app/api/websites', {
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

    const startEditing = (site: Website) => {
        setEditingId(site._id);
        setEditForm({ url: site.url, dateCreated: site.dateCreated, startTime: site.startTime, endTime: site.endTime, strictMode: site.strictMode });
    };

    const getEffectiveStrictMode = (site: any, globalStrictMode: boolean) => {
        if (site.strictMode !== null && site.strictMode !== undefined) {
            return site.strictMode;
        }
        return globalStrictMode;
    }

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
            /*
            const response = await fetch(`https://lockedin-jovk.onrender.com/websites/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });*/
            const { token } = await chrome.storage.local.get('token');

            if (!token) {
                console.error('No userId found');
                return;
            }

            const response = await fetch(`https://lockedin-web-six.vercel.app/api/websites/${id}`, {
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

    const handleDeleteClick = (id: string) => {
        const blocking = isActivelyBlocking(websites, recurringBlocks);
        if (blocking) {
            const site = websites.find(s => s._id === id);
            console.log('site strictMode:', site?.strictMode);
            console.log('global strictMode:', strictMode);
            const effective = site ? getEffectiveStrictMode(site, strictMode) : strictMode;
            console.log('effective strictMode:', effective);
            setIsStrictMode(effective);
            setPendingDeleteId(id);
            setShowConfirm(true);
        } else {
            deleteWebsite(id);
        }
    };

    const deleteWebsite = async (id: string) => {
        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;
            
            await fetch(`https://lockedin-web-six.vercel.app/api/websites/${id}`, {
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
                <div className="website-card" key={site._id}>
                    {editingId === site._id ? (
                        <>
                          <input id="editurl" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="URL"/>
                          <input id="editdate" type="date" value={editForm.dateCreated.split('T')[0]} min={today} onChange={(e) => setEditForm({ ...editForm, dateCreated: e.target.value })}/>
                          <input id="editstart" type="time" value={editForm.startTime} min={editForm.dateCreated.split('T')[0] === today ? currentTime: undefined} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}/>
                          <input id="editend" type="time" value={editForm.endTime} min={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}/>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Strict:</p>
                            <button
                                onClick={() => setEditForm({ ...editForm, strictMode: null })}
                                style={{
                                    padding: '2px 7px',
                                    borderRadius: 20,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: editForm.strictMode === null ? '#0099ff' : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: 10,
                                    cursor: 'pointer'
                                }}
                            >
                                Default
                            </button>
                            <button
                                onClick={() => setEditForm({ ...editForm, strictMode: true })}
                                style={{
                                    padding: '2px 7px',
                                    borderRadius: 20,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: editForm.strictMode === true ? '#ff4d4d' : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: 10,
                                    cursor: 'pointer'
                                }}
                            >
                                On
                            </button>
                            <button
                                onClick={() => setEditForm({ ...editForm, strictMode: false })}
                                style={{
                                    padding: '2px 7px',
                                    borderRadius: 20,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: editForm.strictMode === false ? '#4CAF50' : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: 10,
                                    cursor: 'pointer'
                                }}
                            >
                                Off
                            </button>
                          </div>
                          <button id="savebutton" onClick={() => saveEdit(site._id)}>Save</button>
                          <button id="cancelbutton" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                    ) : (
                        <>
                          <h3 className="card-url">{site.url}</h3>
                          <div className="card-info">
                            <p><span>Date:</span> {site.dateCreated.split('T')[0]}</p>
                            <p><span>Start:</span> {site.startTime}</p>
                            <p><span>End:</span> {site.endTime}</p>
                          </div>
                          <button className="edit-button" onClick={() => startEditing(site)}>Edit</button>
                          <button className="delete-button" onClick={() => handleDeleteClick(site._id)}>Delete</button>
                        </>
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