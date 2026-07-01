import { useState } from 'react';

function RestrictionInfo({ onClose }: {onClose: () => void}) {
    const [text, setText] = useState('');
    const [date, setDate] = useState('');
    const [starttime, setStartTime] = useState('');
    const [endtime, setEndTime] = useState('');
    const [error, setError] = useState('');
    const [strictModeOverride, setStrictModeOverride] = useState<boolean | null>(null);

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
            /*
            const { userId } = await chrome.storage.local.get('userId');
            const response = await fetch('https://lockedin-jovk.onrender.com/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    url: text,
                    dateCreated: date,
                    startTime: starttime,
                    endTime: endtime 
                })
            });*/
            const { token } = await chrome.storage.local.get('token');

            if (!token) {
                console.error('No userId found');
                return;
            }
            
            const response = await fetch('https://lockedin-web-six.vercel.app/api/websites', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: text,
                    dateCreated: date,
                    startTime: starttime,
                    endTime: endtime,
                    strictMode: strictModeOverride 
                })
            });

            if (response.status === 401) {
                await chrome.storage.local.remove('token');
                window.location.href = chrome.runtime.getURL('index.html#/login');
                return;
            }

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <h3 style={{ color: 'white', textAlign: 'center', margin: 0, fontSize: 16 }}>
                    Website Information
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>URL</label>
                    <input
                        id="urltext"
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter URL here"
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Date</label>
                    <input
                        id="datetext"
                        type="date"
                        value={date}
                        min={today}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Time</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            id="starttime"
                            type="time"
                            value={starttime}
                            min={date === today ? currentTime : undefined}
                            onChange={(e) => setStartTime(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>to</span>
                        <input
                            id="endtime"
                            type="time"
                            value={endtime}
                            min={starttime}
                            onChange={(e) => setEndTime(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Strict Mode</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => setStrictModeOverride(null)}
                            style={{
                                padding: '4px 12px',
                                borderRadius: 20,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: strictModeOverride === null ? '#0099ff' : 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: 11,
                                cursor: 'pointer'
                            }}
                        >
                            Default
                        </button>
                        <button
                            onClick={() => setStrictModeOverride(true)}
                            style={{
                                padding: '4px 12px',
                                borderRadius: 20,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: strictModeOverride === true ? '#ff4d4d' : 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: 11,
                                cursor: 'pointer'
                            }}
                        >
                            On
                        </button>
                        <button
                            onClick={() => setStrictModeOverride(false)}
                            style={{
                                padding: '4px 12px',
                                borderRadius: 20,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: strictModeOverride === false ? '#4CAF50' : 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: 11,
                                cursor: 'pointer'
                            }}
                        >
                            Off
                        </button>
                    </div>
                </div>

                {error && <p className="error-message" style={{ margin: 0 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="addbutton" onClick={addWebsite} style={{ flex: 1 }}>
                        Add
                    </button>
                    <button id="xbutton" onClick={onClose}>
                        X
                    </button>
                </div>
            </div>
        </div>
    );
    /*
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, margin: 0 }}>Strict mode:</p>
                <button onClick={() => setStrictModeOverride(null)}
                        style={{
                            padding: '3px 8px',
                            borderRadius: 20,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: strictModeOverride === null ? '#0099ff' : 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontSize: 10,
                            cursor: 'pointer'
                        }}
                >
                    Default 
                </button>
                <button onClick={() => setStrictModeOverride(true)}
                        style={{
                            padding: '3px 8px',
                            borderRadius: 20,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: strictModeOverride === true ? '#ff4d4d' : 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontSize: 10,
                            cursor: 'pointer'
                        }}
                >
                    On
                </button>
                <button onClick={() => setStrictModeOverride(false)}
                        style={{
                            padding: '3px 8px',
                            borderRadius: 20,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: strictModeOverride === false ? '#4CAF50' : 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontSize: 10,
                            cursor: 'pointer'
                        }}
                >
                    Off 
                </button>
            </div>
            <button className="addbutton" onClick={addWebsite}>Add</button>
            <button id="xbutton" onClick={onClose}>X</button>
        </div>
    );*/
}

export default RestrictionInfo;