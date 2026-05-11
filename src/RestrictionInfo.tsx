import { useState } from 'react';

function RestrictionInfo({ onClose }: {onClose: () => void}) {
    const [text, setText] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    return (
        <div className="sitechoicebackground">
            <h3 id="websiteinfo">Website information</h3>
            <p id="url">URL:</p>
            <input id="urltext" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter URL here"/>
            <input id="datetext" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
            <p id="date">Date:</p>
            <input id="timetext" type="time" value={time} onChange={(e) => setTime(e.target.value)}/>
            <p id="time">Time:</p>
            <button className="closebutton" onClick={onClose}>Add</button>
        </div>
    );
}

export default RestrictionInfo;