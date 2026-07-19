import RestrictionInfo from './RestrictionInfo.tsx';
import { useEffect, useState, useRef } from 'react';
import WebsiteList from './WebsiteList.tsx';
import { useNavigate } from 'react-router-dom';
import RecurringForm from './RecurringForm.tsx';
import KeywordForm from './KeywordForm.tsx';
import RecurringList from './RecurringList.tsx';
import ConfirmPhrase from './ConfirmPhrase.tsx';
import ConfirmDialog from './ConfirmDialog.tsx';
import CategoryBlock from './CategoryBlock.tsx';
import UpgradePage from './UpgradePage.tsx';
import KeywordList from './KeywordList.tsx';
import UninstallPassword from './UninstallPassword.tsx';
import FocusSession from './FocusSession.tsx';
import GoalSetting from './GoalSetting.tsx';

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
    const [showKeywordForm, setShowKeywordForm] = useState(false);
    const [keywordKey, setKeywordKey] = useState(0);
    const [showAddSite, setShowAddSite] = useState(false);
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
    const [isTrialing, setIsTrialing] = useState(false);
    const [trialEnd, setTrialEnd] = useState<string | null>(null);
    const [hasHadTrial, setHasHadTrial] = useState(false);
    const [showCancelTrialConfirm, setShowCancelTrialConfirm] = useState(false);
    const [showKeywords, setShowKeywords] = useState(false);
    const [keywordCount, setKeywordCount] = useState(0);
    const [showUninstallPassword, setShowUninstallPassword] = useState(false);
    const [uninstallPasswordSet, setUninstallPasswordSet] = useState(false);
    const [showFocusSession, setShowFocusSession] = useState(false);
    const [goals, setGoals] = useState<{ dailyMinutes: number; weeklyMinutes: number }>({ dailyMinutes: 0, weeklyMinutes: 0 });
    const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
    const [showGoals, setShowGoals] = useState(false);

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

            const statusRes = await fetch('https://www.deeplockin.com/api/stripe/status', {
                headers: { 'authorization': `Bearer ${token}` }
            });

            if (statusRes.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

            const statusData = await statusRes.json();
            if (statusData.plan !== cachedPlan) {
                await chrome.storage.local.set({ plan: statusData.plan });
                setPlan(statusData.plan);
            }
            setCancelAtPeriodEnd(statusData.cancelAtPeriodEnd ?? false);
            setIsTrialing(statusData.isTrialing ?? false);
            setTrialEnd(statusData.trialEnd ?? null);
            setHasHadTrial(statusData.hasHadTrial ?? false);

            const userRes = await fetch('https://www.deeplockin.com/api/user/me', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();
            if (userData.username) {
                setUserName(userData.username);
                await chrome.storage.local.set({ username: userData.username });
            }

            if (statusData.plan === 'pro') {
                const recurringRes = await fetch('https://www.deeplockin.com/api/recurring', {
                    headers: { 'authorization': `Bearer ${token}`}
                });
                const recurringData = await recurringRes.json();
                if (Array.isArray(recurringData)) {
                    await chrome.storage.local.set({ recurringBlocks: recurringData });
                    setRecurringBlocks(recurringData);
                }
            }

            // Sync keyword blocks if pro
            if (statusData.plan === 'pro') {
                const keywordRes = await fetch('https://www.deeplockin.com/api/keywords', {
                    headers: { 'authorization': `Bearer ${token}` }
                });
                const keywordData = await keywordRes.json();
                if (Array.isArray(keywordData)) {
                    await chrome.storage.local.set({ keywordBlocks: keywordData });
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

            const result2 = await chrome.storage.local.get('uninstallPasswordSet');
            setUninstallPasswordSet((result2.uninstallPasswordSet as boolean) ?? false);

            // Fetch goals
            const goalsRes = await fetch('https://www.deeplockin.com/api/user/goals', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const goalsData = await goalsRes.json();
            if (goalsData.goals) {
                setGoals(goalsData.goals);
                await chrome.storage.local.set({ goals: goalsData.goals });
            }

            // Fetch today's focus minutes from stats
            const statsRes = await fetch('https://www.deeplockin.com/api/user/stats', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const statsData = await statsRes.json();
            if (statsData.todayMinutes !== undefined) {
                setTodayFocusMinutes(statsData.todayMinutes);
            }

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

                const statusRes = await fetch('https://www.deeplockin.com/api/stripe/status', {
                    headers: { 'authorization': `Bearer ${token}` }
                });

                if (statusRes.status === 401) {
                    await chrome.storage.local.remove('token');
                    window.location.href = chrome.runtime.getURL('index.html#/login');
                    return;
                }

                const statusData = await statusRes.json();

                setCancelAtPeriodEnd(statusData.cancelAtPeriodEnd ?? false);
                setIsTrialing(statusData.isTrialing ?? false);
                setTrialEnd(statusData.trialEnd ?? null);
                setHasHadTrial(statusData.hasHadTrial ?? false);

                if (statusData.plan !== plan) {
                    await chrome.storage.local.set({ plan: statusData.plan });
                    setPlan(statusData.plan);
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
            if (changes.keywordBlocks?.newValue) {
                // Keywords updated — background.js will pick them up automatically
                console.log('Keyword blocks updated');
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

        if (data.cancelled) {
            await chrome.storage.local.set({ plan: 'free' });
            setPlan('free');
            setIsTrialing(false);
            setShowProfileMenu(false);
            if (data.url) {
                chrome.tabs.create({ url: data.url });
            }
            return;
        }

        if (data.url) {
            chrome.tabs.create({ url: data.url });

            const interval = setInterval(async () => {
                const statusRes = await fetch('https://www.deeplockin.com/api/stripe/status', {
                    headers: { 'authorization': `Bearer ${token}` }
                });
                const statusData = await statusRes.json();

                setCancelAtPeriodEnd(statusData.cancelAtPeriodEnd ?? false);

                if (statusData.plan !== plan) {
                    await chrome.storage.local.set({ plan: statusData.plan });
                    setPlan(statusData.plan);
                }

                if (statusData.cancelAtPeriodEnd) {
                    clearInterval(interval);
                }
            }, 3000);

            setTimeout(() => clearInterval(interval), 600000);
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
            <div style={{ animation: 'fadeInUp 0.8s ease-out forwards' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,170,255,0.2)'
            }}>
                <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0, textShadow: '0 0 8px rgba(0,170,255,0.5)' }}>
                    🔒 LockedIn
                </h1>

                <div ref={profileRef} style={{ position: 'relative' }}>
                    <button
                        className="profile-avatar"
                        onClick={() => setShowProfileMenu(prev => !prev)}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: plan === 'pro' ? 'oklch(0.6 0.19 265)' : 'oklch(0.3 0.03 260 / 0.7)',
                            border: plan === 'pro' ? '2px solid oklch(0.6 0.19 265)' : '2px solid oklch(1 0 0 / 0.15)',
                            boxShadow: plan === 'pro' ? '0 0 12px -2px oklch(0.6 0.19 265 / 0.7)' : 'none',
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
                        <div className="profile-panel">
                            <div className="profile-panel-avatar">{getInitials(username)}</div>
                            <p className="profile-panel-name">{username}</p>
                            <div className={plan === 'pro' ? 'profile-plan-badge' : 'profile-plan-badge profile-plan-badge-free'}>
                                {plan === 'pro'
                                    ? <><span>★</span> {isTrialing ? `PRO TRIAL — ${Math.ceil((new Date(trialEnd!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left` : cancelAtPeriodEnd ? 'PRO — Cancels at period end' : 'PRO'}</>
                                    : 'FREE'}
                            </div>

                            <div className="profile-divider" />

                            {plan === 'free' && (
                                <>
                                    <button
                                        className="profile-item"
                                        onClick={() => setShowUpgradePage(true)}
                                    >
                                        <span className="profile-item-icon">⭐</span>
                                        <span className="profile-item-label">Upgrade to Pro</span>
                                    </button>
                                    <p className="profile-sub-text" style={{ color: websites.length >= 3 ? '#ff4d4d' : 'oklch(0.55 0.02 260)' }}>
                                        {websites.length}/3 sites used
                                        {websites.length >= 3 && ' - Upgrade to Pro for unlimited'}
                                    </p>
                                </>
                            )}

                            {plan === 'pro' && (
                                <>
                                    <div className="profile-item-list">
                                        <button className="profile-item" onClick={() => { handleDashboard(); setShowProfileMenu(false); }}>
                                            <span className="profile-item-icon">📊</span>
                                            <span className="profile-item-label">Stats Dashboard</span>
                                        </button>
                                        <button
                                            className="profile-item"
                                            onClick={() => {
                                                if (isTrialing) {
                                                    setShowCancelTrialConfirm(true);
                                                } else {
                                                    handleManageSubscription();
                                                }
                                                setShowProfileMenu(false);
                                            }}
                                        >
                                            <span className="profile-item-icon">{isTrialing ? '❌' : '💳'}</span>
                                            <span className="profile-item-label">{isTrialing ? 'Cancel Trial' : 'Manage Subscription'}</span>
                                        </button>
                                        <button className="profile-item" onClick={() => { setShowCategoryBlock(true); setShowProfileMenu(false); }}>
                                            <span className="profile-item-icon">🗂️</span>
                                            <span className="profile-item-label">Block Category</span>
                                        </button>
                                        <button className="profile-item" onClick={() => { setShowKeywords(!showKeywords); setShowProfileMenu(false); }}>
                                            <span className="profile-item-icon">🔑</span> 
                                            <span className="profile-item-label">Keyword Blocking</span>
                                        </button>
                                        <button className="profile-item" onClick={() => { setShowUninstallPassword(true); setShowProfileMenu(false); }}>
                                            <span className="profile-item-icon">🔐</span>
                                            <span className="profile-item-label">{uninstallPasswordSet ? 'Uninstall Protection (ON)' : 'Uninstall Protection'}</span>
                                        </button>

                                        <div className="profile-item-row" onClick={handleToggleStrictMode}>
                                            <div className="profile-item-row-left">
                                                <span className="profile-item-icon">🔕</span>
                                                <span className="profile-item-label">Strict Mode</span>
                                            </div>
                                            <span className={strictMode ? 'profile-toggle-pill profile-toggle-pill-on' : 'profile-toggle-pill'}>
                                                {strictMode ? 'ON' : 'OFF'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="profile-divider" />

                                    <div className="profile-sync-row">
                                        <span className="profile-sync-text">Synced {formatLastSynced(lastSynced)}</span>
                                        <button className="profile-sync-btn" onClick={handleManualSync}>
                                            Sync now
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="profile-divider" />

                            <button
                                className="profile-item"
                                onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                            >
                                <span className="profile-item-icon profile-item-icon-danger">🚪</span>
                                <span className="profile-item-label profile-item-label-danger">Log out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
                <div style={{ marginBottom: 12 }}>
                    <div
                        className="site-dropdown-header"
                        onClick={() => setIsOpen(prev => !prev)}
                        style={{
                            marginBottom: isOpen ? 8 : 0
                        }}>
                        <span className="site-dropdown-title">
                            🔒 Blocked Sites <span className="site-dropdown-count">({websites.length}{plan === 'free' ? '/3' : ''})</span>
                        </span>
                        <span className="site-dropdown-chevron">
                            {isOpen ? '▲' : '▼'}
                        </span>
                    </div>

                    {isOpen && (
                        <div>
                            <WebsiteList key={refreshKey} />
                            <button
                                className="site-add-btn"
                                onClick={() => {
                                    if (plan === 'free' && websites.length >= 3) {
                                        setShowUpgradePage(true);
                                    } else {
                                        setShowAddSite(true);
                                    }
                                }}
                                style={{ marginTop: 10 }}
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
                            className="site-dropdown-header"
                            onClick={() => setShowRecurringList(prev => !prev)}
                            style={{
                                marginBottom: showRecurringList ? 8 : 0
                            }}
                        >
                            <span className="site-dropdown-title">
                                🔁 Recurring Blocks <span className="site-dropdown-count">({recurringBlocks.length})</span>
                            </span>
                            <span className="site-dropdown-chevron">
                                {showRecurringList ? '▲' : '▼'}
                            </span>
                        </div>

                        {showRecurringList && (
                            <div>
                                <RecurringList key={recurringKey} />
                                <button
                                    className="site-add-btn"
                                    onClick={() => setShowRecurringForm(true)}
                                    style={{ marginTop: 10 }}
                                >
                                    + Add recurring block
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {plan === 'pro' && (
                    <div style={{ marginBottom: 12 }}>
                        <div
                            className="site-dropdown-header"
                            onClick={() => setShowKeywords(prev => !prev)}
                            style={{
                                marginBottom: showKeywords ? 8 : 0
                            }}
                        >
                            <span className="site-dropdown-title">
                                🔑 Keyword Blocks <span className="site-dropdown-count">({keywordCount})</span>
                            </span>
                            <span className="site-dropdown-chevron">
                                {showKeywords ? '▲' : '▼'}
                            </span>
                        </div>
                        {showKeywords && (
                            <div>
                                <KeywordList key={keywordKey} onCountChange={setKeywordCount} />
                                <button
                                    className="site-add-btn"
                                    onClick={() => setShowKeywordForm(true)}
                                    style={{ marginTop: 10 }}
                                >
                                    + Add keyword
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {plan === 'pro' && (
                    <div style={{ marginBottom: 12 }}>
                        <div
                            className="site-dropdown-header"
                            onClick={() => setShowFocusSession(prev => !prev)}
                            style={{
                                marginBottom: showFocusSession ? 8 : 0
                            }}
                        >
                            <span className="site-dropdown-title">
                                🎯 Focus Session
                            </span>
                            <span className="site-dropdown-chevron">
                                {showFocusSession ? '▲' : '▼'}
                            </span>
                        </div>
                        {showFocusSession && <FocusSession />}
                    </div>
                )}
                {plan === 'pro' && goals.dailyMinutes > 0 && (
                    <div className="focus-goal-progress-card" style={{ marginBottom: 12 }}>
                        <div className="focus-goal-header">
                            <span className="focus-goal-title">🎯 Daily Goal</span>
                            <span style={{ color: 'oklch(0.65 0.02 260)', fontSize: 11 }}>
                                {Math.round(todayFocusMinutes)}m / {goals.dailyMinutes}m
                            </span>
                        </div>
                        <div className="focus-goal-progress-track">
                            <div
                                className={todayFocusMinutes >= goals.dailyMinutes
                                    ? 'focus-goal-progress-fill focus-goal-progress-fill-complete'
                                    : 'focus-goal-progress-fill'}
                                style={{ width: `${Math.min((todayFocusMinutes / goals.dailyMinutes) * 100, 100)}%` }}
                            />
                        </div>
                        {todayFocusMinutes >= goals.dailyMinutes && (
                            <p className="focus-goal-progress-complete-text">
                                ✓ Daily goal reached!
                            </p>
                        )}
                    </div>
                )}

                {/* Goals collapsible section */}
                {plan === 'pro' && (
                    <div style={{ marginBottom: 12 }}>
                        <div
                            className="site-dropdown-header"
                            onClick={() => setShowGoals(prev => !prev)}
                            style={{
                                marginBottom: showGoals ? 8 : 0
                            }}
                        >
                            <span className="site-dropdown-title">
                                📅 Focus Goals
                            </span>
                            <span className="site-dropdown-chevron">
                                {showGoals ? '▲' : '▼'}
                            </span>
                        </div>
                        {showGoals && <GoalSetting />}
                    </div>
                )}
            </div>
            </div>

            {showCategoryBlock && (
                <CategoryBlock onClose={() => {
                    setShowCategoryBlock(false);
                    setRefreshKey(prev => prev + 1);
                    setRecurringKey(prev => prev + 1);
                }} />
            )}
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
                    hasHadTrial={hasHadTrial}
                    onUpgrade={() => {
                        setShowUpgradePage(false);
                        handleUpgrade();
                    }}
                    onClose={() => setShowUpgradePage(false)}
                />
            )}
            {showAddSite && <RestrictionInfo onClose={() => { setShowAddSite(false); setRefreshKey(prev => prev + 1); }} />}
            {showRecurringForm && <RecurringForm onClose={() => { setShowRecurringForm(false); setRecurringKey(prev => prev + 1); }} />}
            {showKeywordForm && <KeywordForm onClose={() => { setShowKeywordForm(false); setKeywordKey(prev => prev + 1); }} />}
            {showCancelTrialConfirm && (
                <ConfirmDialog
                    title="Cancel your free trial?"
                    message="You'll lose access to Pro features (recurring schedules, category blocking, stats dashboard, strict mode, and cross-device sync) right away. You'll need to upgrade to Pro again if you want them back."
                    confirmLabel="Cancel Trial"
                    cancelLabel="Keep Trial"
                    danger
                    onConfirm={() => {
                        setShowCancelTrialConfirm(false);
                        handleManageSubscription();
                    }}
                    onCancel={() => setShowCancelTrialConfirm(false)}
                />
            )}
            {showUninstallPassword && (
                <UninstallPassword
                    isSet={uninstallPasswordSet}
                    onClose={() => setShowUninstallPassword(false)}
                    onUpdate={(isSet) => {
                        setUninstallPasswordSet(isSet);
                        chrome.storage.local.set({ uninstallPasswordSet: isSet });
                    }}
                />
            )}
        </div>
    );
}

export default Menu;