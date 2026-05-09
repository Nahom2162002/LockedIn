import { useState } from 'react';

function RestrictionInfo({ onClose }: {onClose: () => void}) {
    const [text, setText] = useState('');

    return (
        <div className="sitechoicebackground">
            <h3 id="websiteinfo">Website information</h3>
            <p id="url">URL:</p>
            <input id="urltext" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter URL here"/>
            <button className="closebutton" onClick={onClose}>Add</button>
        </div>
    );
}

export default RestrictionInfo;