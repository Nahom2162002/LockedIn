import RestrictionInfo from './RestrictionInfo.tsx';
import { useState } from 'react';
import WebsiteList from './WebsiteList.tsx';

function Menu() {
    const [isOpen, setIsOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAdd = () => {
        setIsOpen(false);
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="menuBackground">
            <div>
                <h1 id="hello">Hello</h1>
                <div className="websiteChoices">
                    <h3>Please add websites you would like to restrict</h3>
                    <button onClick={() => setIsOpen(true)}>+</button>
                    {isOpen && <RestrictionInfo onClose={handleAdd}/>}
                    <div className="websiteList">
                        <WebsiteList key={refreshKey}/>
                    </div>
                </div>
            </div> 
        </div>
    );
}

export default Menu;