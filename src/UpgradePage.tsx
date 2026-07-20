interface UpgradePageProps {
    onUpgrade: () => void;
    onClose: () => void;
    hasHadTrial?: boolean;
}

function UpgradePage({ onUpgrade, onClose, hasHadTrial = false }: UpgradePageProps) {
    const features = [
        { emoji: '🔒', title: 'Unlimited Site Blocking', desc: 'Block as many sites as you need, no restrictions' },
        { emoji: '🔁', title: 'Recurring Schedules', desc: 'Set blocks to repeat every weekday, weekend, or any custom schedule' },
        { emoji: '🗂️', title: 'Category Blocking', desc: 'Block entire categories like Social Media, Gaming, or News in one click' },
        { emoji: '🔑', title: 'Keyword Blocking', desc: 'Block any URL containing a keyword — no need to list every site by name' },
        { emoji: '🎯', title: 'Focus Sessions', desc: 'Pomodoro-style work/break timers that automatically pause your blocks on break' },
        { emoji: '📅', title: 'Focus Goals', desc: 'Set daily and weekly focus targets and track your progress toward them' },
        { emoji: '📊', title: 'Stats Dashboard', desc: 'Track your focus time, streaks, and top distractions' },
        { emoji: '🔕', title: 'Strict Mode', desc: 'Make it harder to disable blocks with a confirmation phrase' },
        { emoji: '🔁', title: 'Cross-Device Sync', desc: 'Your blocks stay in sync across all your browsers and devices' },
    ];

    return (
        <div className="upgrade-overlay">
            <div className="upgrade-card">
                <div className="upgrade-icon">★</div>
                <h2 className="upgrade-title">Upgrade to Pro</h2>
                <p className="upgrade-subtitle">
                    {hasHadTrial ? '$7/month — cancel anytime' : '14 days free, then $7/month — cancel anytime'}
                </p>

                <div className="upgrade-feature-list">
                    {features.map((f, i) => (
                        <div key={i} className="upgrade-feature">
                            <span className="upgrade-feature-icon">{f.emoji}</span>
                            <div>
                                <p className="upgrade-feature-title">{f.title}</p>
                                <p className="upgrade-feature-desc">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="upgrade-cta-btn" onClick={onUpgrade}>
                    {hasHadTrial ? 'Upgrade to Pro — $7/month' : 'Start 14-Day Free Trial'}
                </button>
                {!hasHadTrial && (
                    <p className="upgrade-fine-print">
                        No credit card required. Cancel anytime. (If Stripe asks for payment details during checkout you can skip it — it is optional for the free trial)
                    </p>
                )}

                <button className="upgrade-cancel-btn" onClick={onClose}>
                    Maybe later
                </button>
            </div>
        </div>
    );
}

export default UpgradePage;
