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
            const updated = await response.json();
            setWebsites(websites.map((site) => site._id === id ? updated: site));
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <ul>
            {websites.map((site) => (
                <li key={site._id}>
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
                        <p>URL: {site.url}</p>
                        <p>Date: {site.dateCreated}</p>
                        <p>Start Time: {site.startTime}</p>
                        <p>End Time: {site.endTime}</p>
                        <button onClick={() => startEditing(site)}>Edit</button>
                      </>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default WebsiteList; 