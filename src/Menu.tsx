import RestrictionInfo from './RestrictionInfo.tsx';
import { useEffect, useState, useRef } from 'react';
import WebsiteList from './WebsiteList.tsx';
import { useNavigate } from 'react-router-dom';
import RecurringForm from './RecurringForm.tsx';
import RecurringList from './RecurringList.tsx';
import ConfirmPhrase from './ConfirmPhrase.tsx';
import CategoryBlock from './CategoryBlock.tsx';
import UpgradePage from './UpgradePage.tsx';

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

function Menu() {
    const [isOpen, setIsOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const navigate = useNavigate();
    const [plan, setPlan] = useState<string>('free');
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [showRecurringList, setShowRecurringList] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [websites, setWebsites] = useState<any[]>([]);
    const [recurringBlocks, setRecurringBlocks] = useState<any[]>([]);
    const [showCategoryBlock, setShowCategoryBlock] = useState(false);
    const [strictMode, setStrictMode] = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [username, setUserName] = useState('');
    const profileRef = useRef<HTMLDivElement>(null);
    const [showUpgradePage, setShowUpgradePage] = useState(false);
    const [recurringKey, setRecurringKey] = useState(0);
    const [showAddSite, setShowAddSite] = useState(false);

    useEffect(() => {
        const syncAll = async () => {
            const result = await chrome.storage.local.get(['token', 'plan', 'websites', 'recurringBlocks']);
            const token = result.token as string | undefined;
            const cachedPlan = result.plan as string | undefined;
            const lastSyncedResult = await chrome.storage.local.get('lastSynced');

            setPlan(cachedPlan || 'free');
            setWebsites((result.websites as any[]) || []);
            setRecurringBlocks((result.recurringBlocks as any[]) || []);
            setLastSynced(lastSyncedResult.lastSynced as string || null);

            if (!token) return;

            const planRes = await fetch('https://www.deeplockin.com/api/user/plan', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const planData = await planRes.json();
            if (planData.plan !== cachedPlan) {
                await chrome.storage.local.set({ plan: planData.plan });
                setPlan(planData.plan);
            }

            const userRes = await fetch('https://www.deeplockin.com/api/user/me', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();
            if (userData.username) {
                setUserName(userData.username);
                await chrome.storage.local.set({ username: userData.username });
            }

            if (planData.plan === 'pro') {
                const recurringRes = await fetch('https://www.deeplockin.com/api/recurring', {
                    headers: { 'authorization': `Bearer ${token}`}
                });
                const recurringData = await recurringRes.json();
                if (Array.isArray(recurringData)) {
                    await chrome.storage.local.set({ recurringBlocks: recurringData });
                    setRecurringBlocks(recurringData);
                }
            }

            const websitesRes = await fetch('https://www.deeplockin.com/api/websites', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const websitesData = await websitesRes.json();
            if (Array.isArray(websitesData)) {
                await chrome.storage.local.set({ websites: websitesData });
                setWebsites(websitesData);
            }

            const settingsRes = await fetch('https://www.deeplockin.com/api/user/settings', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const settingsData = await settingsRes.json();
            setStrictMode(settingsData.strictMode ?? false);
            await chrome.storage.local.set({ strictMode: settingsData.strictMode ?? false });

            await chrome.storage.local.set({ lastSynced: new Date().toISOString() });
            setLastSynced(new Date().toISOString());
        };
        syncAll();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const result = await chrome.storage.local.get('token');
                const token = result.token as string | undefined;
                if (!token) return;

                const planRes = await fetch('https://www.deeplockin.com/api/user/plan', {
                    headers: { 'authorization': `Bearer ${token}` }
                });
                const planData = await planRes.json();
                const cached = await chrome.storage.local.get('plan');
                if (planData.plan !== cached.plan) {
                    await chrome.storage.local.set({ plan: planData.plan });
                    setPlan(planData.plan);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.websites?.newValue) {
                setWebsites(changes.websites.newValue as any[]);
            }
            if (changes.recurringBlocks?.newValue) {
                setRecurringBlocks(changes.recurringBlocks.newValue as any[]);
            }
            if (changes.plan?.newValue) {
                setPlan(changes.plan.newValue as string);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const handleLogout = async () => {
        const blocking = isActivelyBlocking(websites, recurringBlocks);
        if (blocking) {
            setShowLogoutConfirm(true);
        } else {
            await performLogout();
        }
    };

    const performLogout = async () => {
        await chrome.storage.local.remove('token');
        await chrome.storage.local.remove('plan');
        navigate('/login');
    };

    const handleUpgrade = async () => {
        const { token } = await chrome.storage.local.get('token');
        const response = await fetch('https://www.deeplockin.com/api/stripe/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();

        if (data.url) {
            chrome.tabs.create({ url: data.url });

            const interval = setInterval(async () => {
                const planRes = await fetch('https://www.deeplockin.com/api/user/plan', {
                    headers: { 'authorization': `Bearer ${token}` }
                });
                const planData = await planRes.json();
                if (planData.plan === 'pro') {
                    await chrome.storage.local.set({ plan: 'pro' });
                    setPlan('pro');
                    clearInterval(interval);
                }
            }, 3000);

            setTimeout(() => clearInterval(interval), 600000);
        }
    };

    const handleManageSubscription = async () => {
        const { token } = await chrome.storage.local.get('token');
        const response = await fetch('https://www.deeplockin.com/api/stripe/portal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.url) {
            chrome.tabs.create({ url: data.url });
        }
    };

    const handleDashboard = async () => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;
        chrome.tabs.create({
            url: `https://www.deeplockin.com/dashboard?token=${token}`
        });
    };

    const handleToggleStrictMode = async () => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;
        const newValue = !strictMode;

        await fetch('https://www.deeplockin.com/api/user/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ strictMode: newValue })
        });

        setStrictMode(newValue);
        await chrome.storage.local.set({ strictMode: newValue });
    };

    const formatLastSynced = (iso: string | null) => {
        if (!iso) return 'Never';
        const date = new Date(iso);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const handleManualSync = async () => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;
        if (!token) return;

        try {
            const websitesRes = await fetch('https://www.deeplockin.com/api/websites', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const websitesData = await websitesRes.json();
            if (Array.isArray(websitesData)) {
                await chrome.storage.local.set({ websites: websitesData });
                setWebsites(websitesData);
            }

            if (plan === 'pro') {
                const recurringRes = await fetch('https://www.deeplockin.com/api/recurring', {
                    headers: { 'authorization': `Bearer ${token}` }
                });
                const recurring = await recurringRes.json();
                if (Array.isArray(recurring)) {
                    await chrome.storage.local.set({ recurringBlocks: recurring });
                    setRecurringBlocks(recurring);
                }
            }

            const now = new Date().toISOString();
            await chrome.storage.local.set({ lastSynced: now });
            setLastSynced(now);
        } catch (err) {
            console.error('Manual sync failed:', err);
        }
    };

    const getInitials = (name: string) => {
        return name ? name.slice(0, 2).toUpperCase() : '?';
    }

    return (
        <div className="menuBackground">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
                <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0 }}>
                    🔒 LockedIn
                </h1>

                <div ref={profileRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowProfileMenu(prev => !prev)}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: plan === 'pro'
                                ? 'linear-gradient(135deg, #0099ff, #0055ff)'
                                : 'rgba(255,255,255,0.15)',
                            border: plan === 'pro' ? '2px solid #0099ff' : '2px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {getInitials(username)}
                    </button>

                    {showProfileMenu && (
                        <div style={{
                            position: 'absolute',
                            top: 44,
                            right: 0,
                            background: '#1a1a2e',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: '8px 0',
                            minWidth: 200,
                            zIndex: 100,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}>
                            
                            <div style={{
                                padding: '10px 16px 12px',
                                borderBottom: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: '0 0 2px 0' }}>
                                    {username}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 20,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: plan === 'pro'
                                            ? 'linear-gradient(135deg, #0099ff, #0055ff)'
                                            : 'rgba(255,255,255,0.1)',
                                        color: 'white'
                                    }}>
                                        {plan === 'pro' ? '⭐ PRO' : 'FREE'}
                                    </span>
                                </div>
                            </div>

                            {plan === 'free' && (
                                <>
                                <button
                                    onClick={() => setShowUpgradePage(true)/*{ handleUpgrade(); setShowProfileMenu(false); }*/}
                                    style={menuItemStyle}
                                >
                                    ⭐ Upgrade to Pro
                                </button>
                                <p style={{
                                    color: websites.length >= 3 ? '#ff4d4d' : 'rgba(255, 255, 255, 0.4)',
                                    fontSize: 11,
                                    textAlign: 'center',
                                    margin: '4px 0'
                                }}>
                                    {websites.length}/3 sites used 
                                    {websites.length >= 3 && ' - Upgrade to Pro for unlimited'}
                                </p>
                                </>
                            )}

                            {plan === 'pro' && (
                                <>
                                    <button onClick={() => { handleDashboard(); setShowProfileMenu(false); }} style={menuItemStyle}>
                                        📊 Stats Dashboard
                                    </button>
                                    <button onClick={() => { handleManageSubscription(); setShowProfileMenu(false); }} style={menuItemStyle}>
                                        💳 Manage Subscription
                                    </button>
                                    <button onClick={() => { setShowCategoryBlock(true); setShowProfileMenu(false); }} style={menuItemStyle}>
                                        🗂 Block Category
                                    </button>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 16px',
                                        cursor: 'pointer'
                                    }}
                                        onClick={handleToggleStrictMode}
                                    >
                                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                                            🚨 Strict Mode
                                        </span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 20,
                                            fontSize: 10,
                                            fontWeight: 700,
                                            background: strictMode ? '#ff4d4d' : 'rgba(255,255,255,0.1)',
                                            color: 'white'
                                        }}>
                                            {strictMode ? 'ON' : 'OFF'}
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 16px',
                                        borderTop: '1px solid rgba(255,255,255,0.08)'
                                    }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                                            🔄 {formatLastSynced(lastSynced)}
                                        </span>
                                        <button
                                            onClick={handleManualSync}
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: 20,
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                background: 'transparent',
                                                color: 'rgba(255,255,255,0.4)',
                                                fontSize: 10,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Sync now
                                        </button>
                                    </div>
                                </>
                            )}

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4 }}>
                                <button
                                    onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                                    style={{ ...menuItemStyle, color: '#ff4d4d' }}
                                >
                                    🚪 Log out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
                <div style={{ marginBottom: 12 }}>
                    <div 
                        onClick={() => setIsOpen(prev => !prev)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            marginBottom: isOpen ? 8 : 0
                        }}>
                        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
                            🔒 Blocked Sites ({websites.length}{plan === 'free' ? '/3' : ''})
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}>
                            {isOpen ? '▲' : '▼'}
                        </span>
                    </div> 
                    
                    {isOpen && (
                        <div>
                            <WebsiteList key={refreshKey} />
                            <button 
                                onClick={() => {
                                    if (plan === 'free' && websites.length >= 3) {
                                        setShowUpgradePage(true);
                                    } else {
                                        setShowAddSite(true);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    marginTop: 8,
                                    padding: '7px',
                                    borderRadius: 8,
                                    border: '1px dashed rgba(255, 255, 255, 0.2)',
                                    background: 'transparent',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: 12,
                                    cursor: 'pointer'
                                }}
                            >
                                + Add site
                            </button>
                            {plan === 'free' && (
                                <p style={{
                                    color: websites.length >= 3 ? '#ff4d4d' : 'rgba(255, 255, 255, 0.4)',
                                    fontSize: 10,
                                    textAlign: 'center',
                                    margin: '4px 0 0 0'
                                }}>
                                    {websites.length}/3 sites used 
                                    {websites.length >= 3 && ' - Upgrade to Pro for unlimited'}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {plan === 'pro' && (
                    <div style={{ marginBottom: 12 }}>
                        <div 
                            onClick={() => setShowRecurringList(prev => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                marginBottom: showRecurringList ? 8 : 0
                            }}
                        >
                            <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
                                🔁 Recurring Blocks ({recurringBlocks.length})
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}>
                                {showRecurringList ? '▲' : '▼'}
                            </span>
                        </div>

                        {showRecurringList && (
                            <div>
                                <RecurringList key={recurringKey} />
                                <button 
                                    onClick={() => setShowRecurringForm(true)}
                                    style={{
                                        width: '100%',
                                        marginTop: 8,
                                        padding: '7px',
                                        borderRadius: 8,
                                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                                        background: 'transparent',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: 12,
                                        cursor: 'pointer'
                                    }}
                                >
                                    + Add recurring block 
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showRecurringForm && <RecurringForm onClose={() => setShowRecurringForm(false)} />}
            {showCategoryBlock && <CategoryBlock onClose={() => setShowCategoryBlock(false)} />}
            {showLogoutConfirm && (
                <ConfirmPhrase
                    action="log out and disable blocking"
                    strictMode={strictMode}
                    onConfirm={async () => {
                        setShowLogoutConfirm(false);
                        await performLogout();
                    }}
                    onCancel={() => setShowLogoutConfirm(false)}
                />
            )}
            {showUpgradePage && (
                <UpgradePage 
                    onUpgrade={() => {
                        setShowUpgradePage(false);
                        handleUpgrade();
                    }}
                    onClose={() => setShowUpgradePage(false)}
                />
            )}
            {showAddSite && <RestrictionInfo onClose={() => { setShowAddSite(false); setRefreshKey(prev => prev + 1); }} />}
            {showRecurringForm && <RecurringForm onClose={() => { setShowRecurringForm(false); setRecurringKey(prev => prev + 1); }} />}
        </div>
    );
}

const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.15s'
};

export default Menu;