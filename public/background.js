const recentlyBlocked = new Map();

// Focus session state — persisted in session storage
async function getFocusSession() {
    const result = await chrome.storage.session.get('focusSession');
    return result.focusSession || null;
}

async function setFocusSession(session) {
    await chrome.storage.session.set({ focusSession: session });
    // Also update local storage so popup can read it
    await chrome.storage.local.set({ focusSession: session });
}

async function clearFocusSession() {
    await chrome.storage.session.remove('focusSession');
    await chrome.storage.local.remove('focusSession');
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('syncData', { periodInMinutes: 5 });
    chrome.alarms.create('cleanupExpired', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create('syncData', { periodInMinutes: 5 });
    chrome.alarms.create('cleanupExpired', { periodInMinutes: 1 });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'startFocusSession') {
        (async () => {
            const { workDuration, breakDuration } = message;
            const session = {
                status: 'active',
                phase: 'work',
                workDuration,
                breakDuration,
                remaining: workDuration * 60,
                lastTick: Date.now(),
                completedSessions: 0,
                startedAt: Date.now()
            };
            await setFocusSession(session);
            chrome.alarms.create('focusSessionTick', { periodInMinutes: 1/60 }); // every second
            sendResponse({ ok: true });
        })();
        return true;
    }

    if (message?.type === 'pauseFocusSession') {
        (async () => {
            const session = await getFocusSession();
            if (session) {
                await setFocusSession({ ...session, status: 'paused' });
            }
            sendResponse({ ok: true });
        })();
        return true;
    }

    if (message?.type === 'resumeFocusSession') {
        (async () => {
            const session = await getFocusSession();
            if (session) {
                await setFocusSession({ 
                    ...session, 
                    status: 'active',
                    lastTick: Date.now()
                });
            }
            sendResponse({ ok: true });
        })();
        return true;
    }

    if (message?.type === 'stopFocusSession') {
        (async () => {
            await clearFocusSession();
            chrome.alarms.clear('focusSessionTick');
            sendResponse({ ok: true });
        })();
        return true;
    }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'cleanupExpired') {
        const result = await chrome.storage.local.get(['websites', 'token']);
        const websites = result.websites || [];
        const token = result.token;

        if (!token || websites.length === 0) return;

        const now = new Date();
        const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const expired = websites.filter(site => {
            const siteDate = site.dateCreated.split('T')[0];
            return siteDate < currentDate || 
                (siteDate === currentDate && site.endTime < currentTime);
        });

        if (expired.length === 0) return;

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

        await chrome.storage.local.set({ websites: remaining });
        console.log(`Cleaned up ${expired.length} expired blocks`);
        return;
    }

    if (alarm.name === 'syncData') {
        await syncToBackend();
    }
    if (alarm.name === 'focusSessionTick') {
        await handleFocusSessionTick();
    }
    if (alarm.name === 'syncConsumption') {
        await syncToBackend();
        await checkGoalProgress();
    }
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) {
        return;
    } 

    if (details.url.includes('blocked.html') || details.url.startsWith('chrome-extension://')) {
        return;
    }

    const lastBlocked = recentlyBlocked.get(details.tabId);
    if (lastBlocked && Date.now() - lastBlocked < 2000) return;

    const result = await chrome.storage.local.get(['websites', 'recurringBlocks', 'token']);
    const websites = result.websites || [];
    const recurringBlocks = result.recurringBlocks || [];
    const token = result.token;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentDay = now.getDay();

    for (const site of websites) {
        const siteDate = site.dateCreated.split('T')[0];

        if (details.url.includes(site.url) &&
            siteDate === currentDate &&
            currentTime >= site.startTime &&
            currentTime <= site.endTime) {
          
          if (token) {
            fetch('https://www.deeplockin.com/api/user/block-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: site.url })
            }).catch(err => console.error('Failed to record block event:', err));
          }

          recentlyBlocked.set(details.tabId, Date.now());
          chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}`) });
          return;
        }
    }

    // Check if we're in a break period — release blocks temporarily
    const sessionResult = await chrome.storage.local.get('focusSession');
    const focusSession = sessionResult.focusSession;
    if (focusSession && focusSession.status === 'active' && focusSession.phase === 'break') {
        return; // Don't block during breaks
    }
    if (!result.token) return; // not logged in

    for (const block of recurringBlocks) {
        if (!block.active) continue;
        if (!block.days.includes(currentDay)) continue;

        if (details.url.includes(block.url) &&
            currentTime >= block.startTime &&
            currentTime <= block.endTime) {
                if (token) {
                    fetch('https://www.deeplockin.com/api/user/block-event', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ url: block.url })
                    }).catch(err => console.error('Failed to record block event:', err));
                }

                recentlyBlocked.set(details.tabId, Date.now());
                chrome.tabs.update(details.tabId, {
                    url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}`)
                });
                return;
            }
    }

    // Check keyword blocks
    const keywordResult = await chrome.storage.local.get('keywordBlocks');
    const keywordBlocks = keywordResult.keywordBlocks || [];

    for (const block of keywordBlocks) {
        if (!block.days.includes(currentDay)) continue;
        if (currentTime < block.startTime || currentTime > block.endTime) continue;

        if (details.url.toLowerCase().includes(block.keyword.toLowerCase())) {
            if (token) {
                fetch('https://www.deeplockin.com/api/user/block-event', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ url: details.url })
                }).catch(err => console.error('Failed to record block event:', err));
            }

            recentlyBlocked.set(details.tabId, Date.now());
            chrome.tabs.update(details.tabId, {
                url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}`)
            });
            return;
        }
    }
});

// Uninstall prevention
chrome.management.onDisabled.addListener(async (info) => {
    if (info.id !== chrome.runtime.id) return;
    await handleUninstallAttempt();
});

chrome.management.onUninstalled.addListener(async (id) => {
    if (id !== chrome.runtime.id) return;
    await handleUninstallAttempt();
});

async function handleUninstallAttempt() {
    const result = await chrome.storage.local.get(['token', 'uninstallPasswordSet', 'uninstallBypass']);
    const token = result.token;
    const passwordSet = result.uninstallPasswordSet;
    const bypass = result.uninstallBypass;

    if (!token || !passwordSet) return;

    if (bypass && Date.now() < bypass) return;

    // Re-enable the extension immediately
    try {
        await chrome.management.setEnabled(chrome.runtime.id, true);
    } catch (err) {
        console.error('Failed to re-enable extension:', err);
    }

    // Open the password prompt
    chrome.tabs.create({
        url: chrome.runtime.getURL('uninstall-guard.html')
    });
}

async function handleFocusSessionTick() {
    const session = await getFocusSession();
    if (!session || session.status === 'stopped') return;

    if (session.status === 'paused') return;

    const now = Date.now();
    const elapsed = (now - session.lastTick) / 1000;
    const remaining = session.remaining - elapsed;

    if (remaining <= 0) {
        // Period ended
        if (session.phase === 'work') {
            // Work period ended — start break
            chrome.notifications.create(`focus-work-end-${Date.now()}`, {
                type: 'basic',
                iconUrl: 'lock-128x128.png',
                title: '🔒 LockedIn — Work Period Complete!',
                message: `Great work! Take a ${session.breakDuration} minute break.`
            });

            const newSession = {
                ...session,
                phase: 'break',
                remaining: session.breakDuration * 60,
                lastTick: now,
                completedSessions: session.completedSessions + 1
            };
            await setFocusSession(newSession);

        } else {
            // Break ended — start next work period
            chrome.notifications.create(`focus-break-end-${Date.now()}`, {
                type: 'basic',
                iconUrl: 'lock-128x128.png',
                title: '🔒 LockedIn — Break Over!',
                message: `Time to focus! Starting work period ${session.completedSessions + 1}.`
            });

            const newSession = {
                ...session,
                phase: 'work',
                remaining: session.workDuration * 60,
                lastTick: now
            };
            await setFocusSession(newSession);
        }
    } else {
        // Update remaining time
        await setFocusSession({
            ...session,
            remaining,
            lastTick: now
        });
    }
}

async function syncToBackend() {
    const result = await chrome.storage.local.get(['token', 'plan']);
    const token = result.token || '';
    const plan = result.plan || '';

    if (!token) return;

    try {
        const websitesRes = await fetch('https://www.deeplockin.com/api/websites', {
            headers: { 'authorization': `Bearer ${token}` }
        });
        if (websitesRes.ok) {
            const websites = await websitesRes.json();
            if (Array.isArray(websites)) {
                await chrome.storage.local.set({
                    websites,
                    lastSynced: new Date().toISOString()
                });
            }
        }

        if (plan === 'pro') {
            const recurringRes = await fetch('https://www.deeplockin.com/api/recurring', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            if (recurringRes.ok) {
                const recurringBlocks = await recurringRes.json();
                if (Array.isArray(recurringBlocks)) {
                    await chrome.storage.local.set({ recurringBlocks });
                }
            }
        }

        console.log('Background sync completed:', new Date().toISOString());
    } catch (err) {
        console.error('Background sync failed:', err);
        return;
    }

    await checkGoalProgress();
}

async function checkGoalProgress() {
    const result = await chrome.storage.local.get(['token', 'goals', 'goalNotified']);
    const token = result.token;
    const goals = result.goals || {};
    const goalNotified = result.goalNotified || {};

    if (!token || !goals.dailyMinutes) return;

    try {
        const statsRes = await fetch('https://www.deeplockin.com/api/user/stats', {
            headers: { 'authorization': `Bearer ${token}` }
        });
        const stats = await statsRes.json();

        const today = new Date().toISOString().split('T')[0];

        // Daily goal notification — fire once per day
        if (
            stats.todayMinutes >= goals.dailyMinutes &&
            goalNotified.daily !== today
        ) {
            chrome.notifications.create(`goal-daily-${Date.now()}`, {
                type: 'basic',
                iconUrl: 'lock-128x128.png',
                title: '🎯 LockedIn — Daily Goal Reached!',
                message: `You've hit your daily focus goal of ${goals.dailyMinutes} minutes. Great work!`
            });
            await chrome.storage.local.set({
                goalNotified: { ...goalNotified, daily: today }
            });
        }
    } catch (err) {
        console.error('Goal check failed:', err);
    }
}