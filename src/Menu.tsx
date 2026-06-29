import RestrictionInfo from './RestrictionInfo.tsx';
import { useEffect, useState } from 'react';
import WebsiteList from './WebsiteList.tsx';
import { useNavigate } from 'react-router-dom';
import RecurringForm from './RecurringForm.tsx';
import RecurringList from './RecurringList.tsx';
import ConfirmPhrase from './ConfirmPhrase.tsx';
import CategoryBlock from './CategoryBlock.tsx';

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

    useEffect(() => {
        const syncAll = async () => {
            const result = await chrome.storage.local.get(['token', 'plan', 'websites', 'recurringBlocks']);
            const token = result.token as string | undefined;
            const cachedPlan = result.plan as string | undefined;

            setPlan(cachedPlan || 'free');
            setWebsites((result.websites as any[]) || []);
            setRecurringBlocks((result.recurringBlocks as any[]) || []);

            if (!token) return;

            const planRes = await fetch('https://lockedin-web-six.vercel.app/api/user/plan', {
                headers: { 'authorization': `Bearer ${token}`}
            });
            const planData = await planRes.json();
            if (planData.plan !== cachedPlan) {
                await chrome.storage.local.set({ plan: planData.plan });
                setPlan(planData.plan);
            }

            if (planData.plan === 'pro') {
                const recurringRes = await fetch('https://lockedin-web-six.vercel.app/api/recurring', {
                    headers: { 'authorization': `Bearer ${token}`}
                });
                const recurringData = await recurringRes.json();
                if (Array.isArray(recurringData)) {
                    await chrome.storage.local.set({ recurringBlocks: recurringData });
                    setRecurringBlocks(recurringData);
                }
            }

            const websitesRes = await fetch('https://lockedin-web-six.vercel.app/api/websites', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const websitesData = await websitesRes.json();
            if (Array.isArray(websitesData)) {
                await chrome.storage.local.set({ websites: websitesData });
                setWebsites(websitesData);
            }

            const settingsRes = await fetch('https://lockedin-web-six.vercel.app/api/user/settings', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const settingsData = await settingsRes.json();
            setStrictMode(settingsData.strictMode ?? false);
            await chrome.storage.local.set({ strictMode: settingsData.strictMode ?? false });
        };
        syncAll();
    }, []);

    const handleAdd = () => {
        setIsOpen(false);
        setRefreshKey(prev => prev + 1);
    };

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
        const response = await fetch('https://lockedin-web-six.vercel.app/api/stripe/checkout', {
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
                const planRes = await fetch('https://lockedin-web-six.vercel.app/api/user/plan', {
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
        const response = await fetch('https://lockedin-web-six.vercel.app/api/stripe/portal', {
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
            url: `https://lockedin-web-six.vercel.app/dashboard?token=${token}`
        });
    };

    const handleToggleStrictMode = async () => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;
        const newValue = !strictMode;

        await fetch('https://lockedin-web-six.vercel.app/api/user/settings', {
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

    return (
        <div className="menuBackground">
            <div>
                <h1 id="hello">Hello</h1>
                <div className="websiteChoices">
                    <h3>Please add websites you would like to restrict</h3>
                    <button id="plusbutton" onClick={() => setIsOpen(true)}>+</button>
                    {isOpen && <RestrictionInfo onClose={handleAdd}/>}
                    <div className="websiteList">
                        <WebsiteList key={refreshKey}/>
                    </div>
                </div>
                <button className="authbutton" onClick={handleLogout}>
                    Log out
                </button>
                {plan === 'free' ? (
                    <button className="authbutton" onClick={handleUpgrade}>
                        Upgrade to Pro
                    </button>
                ) : (
                    <p style={{ color: '#4CAF50', textAlign: 'center' }}>Pro Plan Active</p>
                )}

                {plan === 'pro' && (
                    <>
                        <button className="authbutton" onClick={handleDashboard}>
                            View Stats Dashboard
                        </button>
                        <button className="authbutton" onClick={handleManageSubscription}>
                            Manage Subscription 
                        </button>
                        <button className="authbutton" onClick={() => setShowRecurringForm(true)}>
                            + Recurring Block 
                        </button>
                        <button className="authbutton" onClick={() => setShowRecurringList(!showRecurringList)}>
                            View Recurring Blocks 
                        </button>
                        <button className="authbutton" onClick={() => setShowCategoryBlock(true)}>
                            Block Category 
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0'}}>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, margin: 0 }}>
                                🚨 Strict Mode 
                            </p>
                            <button onClick={handleToggleStrictMode}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: 20,
                                        border: 'none',
                                        background: strictMode ? '#ff4d4d' : 'rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                            >
                                {strictMode ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {showRecurringForm && (
                            <RecurringForm onClose={() => setShowRecurringForm(false)} />
                        )}
                        {showRecurringList && (
                            <RecurringList />
                        )}
                        {showCategoryBlock && (
                            <CategoryBlock onClose={() => setShowCategoryBlock(false)} />
                        )}
                    </>
                )}
                {showLogoutConfirm && (
                    <ConfirmPhrase action="log out and disable blocking" strictMode={strictMode} onConfirm={async () => {
                        setShowLogoutConfirm(false);
                        await performLogout();
                    }}
                    onCancel={() => setShowLogoutConfirm(false)}
                    />
                )}
            </div> 
        </div>
    );
}

export default Menu;