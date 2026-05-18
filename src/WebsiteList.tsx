import { useState, useEffect } from 'react';

interface Website {
    _id: string;
    url: string;
    dateCreated: string;
    startTime: string;
    endTime: string;
}

function WebsiteList() {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<Website, '_id'>>({ url: '', dateCreated: '', startTime: '', endTime: ''});

    useEffect(() => {
        const fetchWebsites = async () => {
            const response = await fetch('https://lockedin-jovk.onrender.com/websites');
            const data = await response.json();
            setWebsites(data);
            chrome.storage.local.set({ websites: data });
        };
        fetchWebsites();
    }, []);

    const startEditing = (site: Website) => {
        setEditingId(site._id);
        setEditForm({ url: site.url, dateCreated: site.dateCreated, startTime: site.startTime, endTime: site.endTime });
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
            const response = await fetch(`https://lockedin-jovk.onrender.com/websites/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            const updatedSite = await response.json();
            const updated = websites.map((site) => site._id === id ? updatedSite : site);
            setWebsites(updated);
            chrome.storage.local.set({ websites: updated });
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const deleteWebsite = async (id: string) => {
        try {
            await fetch(`https://lockedin-jovk.onrender.com/websites/${id}`, {
                method: 'DELETE'
            });
            const updated = websites.filter((site) => site._id !== id);
            setWebsites(updated);
            chrome.storage.local.set({ websites: updated });
        } catch (err) {
            console.error(err);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
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
                          <button className="delete-button" onClick={() => deleteWebsite(site._id)}>Delete</button>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

export default WebsiteList; 