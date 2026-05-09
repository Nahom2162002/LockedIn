import RestrictionInfo from './RestrictionInfo.tsx';
import { useState } from 'react';

function Menu() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="menuBackground">
            <div>
                <h1 id="hello">Hello</h1>
                <div className="websiteChoices">
                    <h3>Please add websites you would like to restrict</h3>
                    <button onClick={() => setIsOpen(true)}>+</button>
                    {isOpen && <RestrictionInfo onClose={() => setIsOpen(false)}/>}
                </div>
            </div> 
        </div>
    );
}

export default Menu;