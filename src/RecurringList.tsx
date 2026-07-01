import { useState, useEffect } from 'react';

interface RecurringBlock {
    _id: string;
    url: string;
    startTime: string;
    endTime: string;
    days: number[];
    active: boolean;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function RecurringList() {
    const [blocks, setBlocks] = useState<RecurringBlock[]>([]);

    useEffect(() => {
        const fetchBlocks = async () => {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

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
        <div className="website-list">
            {blocks.map(block => (
                <div className="website-card" key={block._id} style={{ opacity: block.active ? 1 : 0.5, height: 'auto', padding: '8px 4px', width: '30%' }}>
                    <h3 className="card-url" style={{ fontSize: 12 }}>{block.url}</h3>
                    <div className="card-info" style={{ fontSize: 11, gap: 2 }}>
                        <p style={{ margin: 0 }}>
                            <span>Days: </span>
                            {block.days.sort().map(d => DAY_LABELS[d]).join(', ')}
                        </p>
                        <p style={{ margin: 0 }}><span>Time: </span>{block.startTime} - {block.endTime}</p>
                        <p style={{ margin: 0 }}><span>Status: </span>{block.active ? 'Active' : 'Paused'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button className="edit-button" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => toggleActive(block._id, block.active)}>
                            {block.active ? 'Pause' : 'Resume'}
                        </button>
                        <button className="delete-button" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => deleteBlock(block._id)}>
                            Delete 
                        </button>
                    </div>
                </div>    
            ))}
        </div>
    );
}

export default RecurringList;