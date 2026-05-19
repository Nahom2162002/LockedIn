import { useState } from 'react';

function RestrictionInfo({ onClose }: {onClose: () => void}) {
    const [text, setText] = useState('');
    const [date, setDate] = useState('');
    const [starttime, setStartTime] = useState('');
    const [endtime, setEndTime] = useState('');
    const [error, setError] = useState('');

    const addWebsite = async () => {
        if (!text || !date || !starttime || !endtime) {
            setError('Please fill in all fields');
            return;
        }

        if (endtime <= starttime) {
            setError("End time must be after start time");
            return;
        }

        if (starttime < currentTime) {
            setError("This time has already passed");
            return;
        }

        try {
            const response = await fetch('https://lockedin-jovk.onrender.com/websites', {
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

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return (
        <div className="sitechoicebackground">
            <h3 id="websiteinfo">Website information</h3>
            <p id="url">URL:</p>
            <input id="urltext" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter URL here"/>
            <input id="datetext" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)}/>
            <p id="date">Date:</p>
            <input id="starttime" type="time" value={starttime} min={date === today ? currentTime: undefined} onChange={(e) => setStartTime(e.target.value)}/>
            <p id="time">Time:</p>
            <input id="endtime" type="time" value={endtime} min={starttime} onChange={(e) => setEndTime(e.target.value)}/>
            <p id="to">to</p>
            {error && <p className="error-message">{error}</p>}
            <button className="addbutton" onClick={addWebsite}>Add</button>
            <button id="xbutton" onClick={onClose}>X</button>
        </div>
    );
}

export default RestrictionInfo;