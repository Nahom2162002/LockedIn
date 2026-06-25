import RestrictionInfo from './RestrictionInfo.tsx';
import { useState } from 'react';
import WebsiteList from './WebsiteList.tsx';
import { useNavigate } from 'react-router-dom';

function Menu() {
    const [isOpen, setIsOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleAdd = () => {
        setIsOpen(false);
        setRefreshKey(prev => prev + 1);
    };

    const handleLogout = async () => {
        setLoading(true);
        await chrome.storage.local.remove('token');
        navigate('/login');
    }

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
        }
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
                <button className="authbutton" onClick={handleLogout} disabled={loading}>
                    {loading ? "Logging out..." : "Log out"}
                </button>
                <button className="authbutton" onClick={handleUpgrade}>
                    Upgrade to Pro
                </button>
            </div> 
        </div>
    );
}

export default Menu;