import { useState } from 'react';

function RestrictionInfo({ onClose }: {onClose: () => void}) {
    const [text, setText] = useState('');
    const [date, setDate] = useState('');
    const [starttime, setStartTime] = useState('');
    const [endtime, setEndTime] = useState('');

    const addWebsite = async () => {
        try {
            const response = await fetch('http://localhost:3001/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: text,
                    dateCreated: date,
                    startTime: starttime,
                    endTime: endtime 
                })
            });
            const data = await response.json();
            console.log(data);
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="sitechoicebackground">
            <h3 id="websiteinfo">Website information</h3>
            <p id="url">URL:</p>
            <input id="urltext" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter URL here"/>
            <input id="datetext" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)}/>
            <p id="date">Date:</p>
            <input id="starttime" type="time" value={starttime} onChange={(e) => setStartTime(e.target.value)}/>
            <p id="time">Time:</p>
            <input id="endtime" type="time" value={endtime} onChange={(e) => setEndTime(e.target.value)}/>
            <p id="to">to</p>
            <button className="addbutton" onClick={addWebsite}>Add</button>
            <button id="xbutton" onClick={onClose}>X</button>
        </div>
    );
}

export default RestrictionInfo;