interface UpgradePageProps {
    onUpgrade: () => void;
    onClose: () => void;
}

function UpgradePage({ onUpgrade, onClose }: UpgradePageProps) {
    const features = [
        { emoji: '🔒', title: 'Unlimited Site Blocking', desc: 'Block as many sites as you need, no restrictions' },
        { emoji: '🔁', title: 'Recurring Schedules', desc: 'Set blocks to repeat every weekday, weekend, or any custom schedule' },
        { emoji: '🗂', title: 'Category Blocking', desc: 'Block entire categories like Social Media, Gaming, or News in one click' },
        { emoji: '📊', title: 'Stats Dashboard', desc: 'Track your focus time, streaks, and top distractions' },
        { emoji: '🚨', title: 'Strict Mode', desc: 'Make it harder to disable blocks with a confirmation phrase' },
        { emoji: '🔄', title: 'Cross-Device Sync', desc: 'Your blocks stay in sync across all your browsers and devices' },
        { emoji: '🔐', title: 'Password Protection', desc: 'Prevent yourself from disabling blocks on impulse' },
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '16px'
        }}>
            <div style={{
                animation: 'fadeInUp 0.8s ease-out forwards',
                background: 'linear-gradient(135deg, #0d0d1a, #1a1a2e)',
                border: '1px solid rgba(0,153,255,0.3)',
                borderRadius: 16,
                padding: '24px 20px',
                maxWidth: 340,
                margin: '0 auto'
            }}>
                
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <p style={{ fontSize: 32, margin: 0 }}>⭐</p>
                    <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '8px 0 4px' }}>
                        Upgrade to Pro
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
                        $7/month — cancel anytime
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{f.emoji}</div>
                            <div style={{ flex: 1 }}>
                                <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: '0 0 2px 0' }}>
                                    {f.title}
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
                                    {f.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onUpgrade}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0099ff, #0055ff)',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: 10
                    }}
                >
                    Upgrade to Pro — $7/month
                </button>
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 13,
                        cursor: 'pointer'
                    }}
                >
                    Maybe later
                </button>
            </div>
        </div>
    );
}

export default UpgradePage;