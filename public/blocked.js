const params = new URLSearchParams(window.location.search);
const blockedUrl = params.get('url');

function checkIfUnblocked() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentDay = now.getDay();

    chrome.storage.local.get(['websites', 'recurringBlocks', 'keywordBlocks', 'focusSession'], (result) => {
        const websites = result.websites || [];
        const recurringBlocks = result.recurringBlocks || [];
        const keywordBlocks = result.keywordBlocks || [];
        const focusSession = result.focusSession;

        if (focusSession && focusSession.status === 'active' && focusSession.phase === 'break') {
            if (blockedUrl) window.location.href = blockedUrl;
            return;
        }

        const isStillBlocked = websites.some((site) => {
            const siteDate = site.dateCreated.split('T')[0];
            return blockedUrl && blockedUrl.includes(site.url) &&
                siteDate === currentDate &&
                currentTime <= site.endTime;
        }) || recurringBlocks.some((block) => {
            return block.active && blockedUrl && blockedUrl.includes(block.url) &&
                block.days.includes(currentDay) &&
                currentTime >= block.startTime &&
                currentTime <= block.endTime;
        }) || keywordBlocks.some((block) => {
            return blockedUrl && blockedUrl.toLowerCase().includes(block.keyword.toLowerCase()) &&
                block.days.includes(currentDay) &&
                currentTime >= block.startTime &&
                currentTime <= block.endTime;
        });

        if (!isStillBlocked && blockedUrl) {
            window.location.href = blockedUrl;
        }
    });
}

checkIfUnblocked();
setInterval(checkIfUnblocked, 10000);