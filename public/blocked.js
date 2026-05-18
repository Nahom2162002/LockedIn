const params = new URLSearchParams(window.location.search);
const blockedUrl = params.get('url');

function checkIfUnblocked() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    chrome.storage.local.get('websites', (result) => {
        const websites = result.websites;

        if (!websites) {
            return;
        }

        const isStillBlocked = websites.some((site) => {
            const siteDate = site.dateCreated.split('T')[0];
            return blockedUrl && blockedUrl.includes(site.url) && 
                siteDate === currentDate && 
                currentTime <= site.endTime;
        });

        if (!isStillBlocked && blockedUrl) {
            window.location.href = blockedUrl;
        }
    });
}

checkIfUnblocked();
setInterval(checkIfUnblocked, 10000);