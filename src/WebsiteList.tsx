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
            const response = await fetch('http://localhost:3001/websites');
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
        try {
            const response = await fetch(`http://localhost:3001/websites/${id}`, {
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
            await fetch(`http://localhost:3001/websites/${id}`, {
                method: 'DELETE'
            });
            const updated = websites.filter((site) => site._id !== id);
            setWebsites(updated);
            chrome.storage.local.set({ websites: updated });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="website-list">
            {websites.map((site) => (
                <div className="website-card" key={site._id}>
                    {editingId === site._id ? (
                        <>
                          <input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="URL"/>
                          <input type="date" value={editForm.dateCreated} onChange={(e) => setEditForm({ ...editForm, dateCreated: e.target.value })}/>
                          <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}/>
                          <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}/>
                          <button onClick={() => saveEdit(site._id)}>Save</button>
                          <button onClick={() => setEditingId(null)}>Cancel</button>
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