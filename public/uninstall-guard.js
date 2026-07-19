const input = document.getElementById('passwordInput');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

function showMessage(text, isError) {
    message.textContent = text;
    message.className = isError ? 'message error' : 'message success';
    message.style.display = 'block';
}

submitBtn.addEventListener('click', async () => {
    const password = input.value;
    if (!password) {
        showMessage('Please enter your password', true);
        return;
    }

    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;

    try {
        const result = await chrome.storage.local.get('token');
        const token = result.token;

        const response = await fetch('https://www.deeplockin.com/api/user/uninstall-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.valid) {
            showMessage('Password correct — you may now disable or uninstall LockedIn.', false);
            // Store temporary bypass for 30 seconds
            await chrome.storage.local.set({ 
                uninstallBypass: Date.now() + 30000 
            });
            setTimeout(() => window.close(), 2000);
        } else {
            showMessage('Incorrect password. LockedIn will remain active.', true);
            input.value = '';
            submitBtn.textContent = 'Confirm';
            submitBtn.disabled = false;
        }
    } catch (err) {
        showMessage('Connection failed. Please try again.', true);
        submitBtn.textContent = 'Confirm';
        submitBtn.disabled = false;
    }
});

cancelBtn.addEventListener('click', () => {
    window.close();
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
});