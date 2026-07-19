import { useState, useEffect } from 'react';
import ConfirmPhrase from './ConfirmPhrase.tsx';

interface KeywordBlock {
    _id: string;
    keyword: string;
    createdAt: string;
}

interface KeywordListProps {
    onCountChange?: (count: number) => void;
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

function KeywordList({ onCountChange }: KeywordListProps) {
    const [keywords, setKeywords] = useState<KeywordBlock[]>([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [strictMode, setStrictMode] = useState(false);

    useEffect(() => {
        const fetchKeywords = async () => {
            const result = await chrome.storage.local.get(['token', 'strictMode']);
            const token = result.token as string;
            setStrictMode((result.strictMode as boolean) ?? false);

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

    const handleAdd = async () => {
        if (!newKeyword.trim()) {
            setError('Please enter a keyword');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await chrome.storage.local.get('token');
            const token = result.token as string;

            const response = await fetch('https://www.deeplockin.com/api/keywords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ keyword: newKeyword.trim() })
            });

            const data = await response.json();
            if (data.error) {
                setError(data.error);
            } else {
                const updated = [...keywords, data.block];
                setKeywords(updated);
                await chrome.storage.local.set({ keywordBlocks: updated });
                setNewKeyword('');
            }
        } catch {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = async (id: string) => {
        const result = await chrome.storage.local.get(['websites', 'recurringBlocks', 'strictMode']);
        const freshWebsites = (result.websites as any[]) || [];
        const freshRecurring = (result.recurringBlocks as any[]) || [];
        const sm = (result.strictMode as boolean) ?? false;
        setStrictMode(sm);

        if (isActivelyBlocking(freshWebsites, freshRecurring)) {
            setPendingDeleteId(id);
            setShowConfirm(true);
        } else {
            deleteKeyword(id);
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
            <div className="glass-row">
                <input
                    className="glass-input"
                    type="text"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="e.g. gambling, news, reddit"
                    style={{ flex: 1, minWidth: 0 }}
                />
                <button
                    className="site-btn site-btn-primary"
                    onClick={handleAdd}
                    disabled={loading}
                    style={{ flex: '0 0 auto', padding: '9px 16px' }}
                >
                    {loading ? '...' : 'Add'}
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="website-list" style={{ marginTop: 8 }}>
                {keywords.length === 0 ? (
                    <p className="site-blocks-note" style={{ textAlign: 'center', margin: '12px 0 0', color: 'white' }}>
                        No keywords yet — any URL containing your keyword will be blocked
                    </p>
                ) : (
                    keywords.map(block => (
                        <div key={block._id} className="site-card">
                            <div className="site-card-header" style={{ cursor: 'default' }}>
                                <span className="site-card-name">🔑 {block.keyword}</span>
                                <button
                                    className="site-btn site-btn-danger"
                                    onClick={() => handleDeleteClick(block._id)}
                                    style={{ flex: '0 0 auto', padding: '6px 14px' }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showConfirm && (
                <ConfirmPhrase
                    action="delete a keyword block"
                    strictMode={strictMode}
                    onConfirm={() => {
                        if (pendingDeleteId) deleteKeyword(pendingDeleteId);
                        setShowConfirm(false);
                        setPendingDeleteId(null);
                    }}
                    onCancel={() => {
                        setShowConfirm(false);
                        setPendingDeleteId(null);
                    }}
                />
            )}
        </>
    );
}

export default KeywordList;