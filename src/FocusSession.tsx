import { useState, useEffect, useRef } from 'react';

interface Session {
    status: 'active' | 'paused' | 'stopped';
    phase: 'work' | 'break';
    workDuration: number;
    breakDuration: number;
    remaining: number;
    lastTick: number;
    completedSessions: number;
    startedAt: number;
}

const PRESETS = [
    { label: 'Classic', work: 25, break: 5 },
    { label: 'Short', work: 15, break: 3 },
    { label: 'Long', work: 50, break: 10 },
];

function FocusSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [displayRemaining, setDisplayRemaining] = useState<number | null>(null);
    const [workDuration, setWorkDuration] = useState(25);
    const [breakDuration, setBreakDuration] = useState(5);
    const [selectedPreset, setSelectedPreset] = useState('Classic');
    const [isCustom, setIsCustom] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load session from storage on mount
    useEffect(() => {
        const loadSession = async () => {
            const result = await chrome.storage.local.get('focusSession');
            if (result.focusSession) {
                setSession(result.focusSession as Session);
            }
        };
        loadSession();

        // Listen for storage changes from background.js
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.focusSession?.newValue) {
                setSession(changes.focusSession.newValue as Session);
            } else if (changes.focusSession?.oldValue && !changes.focusSession?.newValue) {
                setSession(null);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    // background.js only persists an updated `remaining` roughly every 30s (the platform
    // floor on repeating alarms), so tick the displayed countdown locally every second
    // between those updates, resyncing to the authoritative value whenever it arrives.
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (!session) {
            setDisplayRemaining(null);
            return;
        }

        const computeRemaining = () => {
            if (session.status !== 'active') return session.remaining;
            const elapsed = (Date.now() - session.lastTick) / 1000;
            return Math.max(0, session.remaining - elapsed);
        };

        setDisplayRemaining(computeRemaining());

        if (session.status === 'active') {
            intervalRef.current = setInterval(() => {
                setDisplayRemaining(computeRemaining());
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [session]);

    const handleStart = async () => {
        await chrome.runtime.sendMessage({
            type: 'startFocusSession',
            workDuration,
            breakDuration
        });
    };

    const handlePause = async () => {
        await chrome.runtime.sendMessage({ type: 'pauseFocusSession' });
    };

    const handleResume = async () => {
        await chrome.runtime.sendMessage({ type: 'resumeFocusSession' });
    };

    const handleStop = async () => {
        await chrome.runtime.sendMessage({ type: 'stopFocusSession' });
        setSession(null);
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        setSelectedPreset(preset.label);
        setWorkDuration(preset.work);
        setBreakDuration(preset.break);
        setIsCustom(false);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getProgress = () => {
        if (!session || displayRemaining === null) return 0;
        const total = session.phase === 'work'
            ? session.workDuration * 60
            : session.breakDuration * 60;
        return ((total - displayRemaining) / total) * 100;
    };

    const isWork = session?.phase === 'work';
    const phaseLabel = isWork ? '🎯 Focus Time' : '☕ Break Time';

    return (
        <div className="focus-wrap">
            {!session ? (
                <>
                    <div className="focus-preset-row">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.label}
                                onClick={() => applyPreset(preset)}
                                className={selectedPreset === preset.label && !isCustom
                                    ? 'focus-preset-btn focus-preset-btn-active'
                                    : 'focus-preset-btn'}
                            >
                                {preset.label}
                                <span className="focus-preset-sub">
                                    {preset.work}m/{preset.break}m
                                </span>
                            </button>
                        ))}
                        <button
                            onClick={() => setIsCustom(true)}
                            className={isCustom ? 'focus-preset-btn focus-preset-btn-active' : 'focus-preset-btn'}
                        >
                            Custom
                        </button>
                    </div>

                    {/* Custom duration inputs */}
                    {isCustom && (
                        <div className="glass-row">
                            <div className="glass-field" style={{ flex: 1, marginBottom: 0 }}>
                                <p className="glass-label">Work (min)</p>
                                <input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={workDuration}
                                    onChange={e => setWorkDuration(parseInt(e.target.value) || 25)}
                                    className="glass-input"
                                    style={{ width: '100%', textAlign: 'center' }}
                                />
                            </div>
                            <span>+</span>
                            <div className="glass-field" style={{ flex: 1, marginBottom: 0 }}>
                                <p className="glass-label">Break (min)</p>
                                <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={breakDuration}
                                    onChange={e => setBreakDuration(parseInt(e.target.value) || 5)}
                                    className="glass-input"
                                    style={{ width: '100%', textAlign: 'center' }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="focus-summary">
                        <span>🎯 {workDuration} min work</span>
                        <span>☕ {breakDuration} min break</span>
                    </div>

                    <button className="add-website-btn" onClick={handleStart} style={{ width: '100%' }}>
                        Start Focus Session
                    </button>
                </>
            ) : (
                <>
                    <div className={isWork ? 'focus-active-card focus-active-card-work' : 'focus-active-card focus-active-card-break'}>
                        <p className={isWork ? 'focus-phase-label focus-phase-label-work' : 'focus-phase-label focus-phase-label-break'}>
                            {phaseLabel}
                        </p>
                        <p className="focus-timer">
                            {formatTime(displayRemaining ?? session.remaining)}
                        </p>

                        <div className="focus-progress-track">
                            <div
                                className={isWork ? 'focus-progress-fill focus-progress-fill-work' : 'focus-progress-fill focus-progress-fill-break'}
                                style={{ width: `${getProgress()}%` }}
                            />
                        </div>

                        <p className="focus-session-count">
                            {session.completedSessions} session{session.completedSessions !== 1 ? 's' : ''} completed
                        </p>
                    </div>

                    <div className="site-btn-row">
                        {session.status === 'active' ? (
                            <button className="site-btn" onClick={handlePause}>
                                ⏸ Pause
                            </button>
                        ) : (
                            <button className="site-btn site-btn-primary" onClick={handleResume}>
                                ▶ Resume
                            </button>
                        )}
                        <button className="site-btn site-btn-danger" onClick={handleStop}>
                            ⏹ Stop
                        </button>
                    </div>

                    {session.phase === 'break' && (
                        <p className="focus-break-note">
                            ✓ All blocked sites are temporarily released during your break
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

export default FocusSession;
