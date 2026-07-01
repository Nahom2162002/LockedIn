const recentlyBlocked = new Map();

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('syncData', { periodInMinutes: 5 });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create('syncData', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'syncData') return;

    const result = await chrome.storage.local.get(['token', 'plan']);
    const token = result.token || '';
    const plan = result.plan || '';

    if (!token) return;

    try {
        const websitesRes = await fetch('https://lockedin-web-six.vercel.app/api/websites', {
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
            const recurringRes = await fetch('https://lockedin-web-six.vercel.app/api/recurring', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            if (recurringRes.ok) {
                const recurringBlocks = await recurringRes.json();
                if (Array.isArray(recurringBlocks)) {
                    await chrome.storage.local.set({ recurringBlocks });
                }
            }
        }

        console.log('Background sycn completed:', new Date().toISOString());
    } catch (err) {
        console.error('Background sync failed:', err);
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
            fetch('https://lockedin-web-six.vercel.app/api/user/block-event', {
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

    for (const block of recurringBlocks) {
        if (!block.active) continue;
        if (!block.days.includes(currentDay)) continue;

        if (details.url.includes(block.url) &&
            currentTime >= block.startTime &&
            currentTime <= block.endTime) {
                if (token) {
                    fetch('https://lockedin-web-six.vercel.app/api/user/block-event', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ url: block.url })
                    }).catch(err => console.error('Failed to record block event:', err));
                }

                chrome.tabs.update(details.tabId, {
                    url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}`)
                });
                return;
            }
    }
});