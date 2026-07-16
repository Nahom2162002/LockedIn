import { useState } from 'react';

const NORMAL_PHRASE = 'I WANT TO BREAK MY FOCUS';
const STRICT_PHRASE = 'I ACKNOWLEDGE THAT I AM ABOUT TO BREAK MY FOCUS AND ACCEPT THE CONSEQUENCES';

interface ConfirmPhraseProps {
    onConfirm: () => void;
    onCancel: () => void;
    action: string;
    strictMode?: boolean;
}

function ConfirmPhrase({ onConfirm, onCancel, action, strictMode = false }: ConfirmPhraseProps) {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    const PHRASE = strictMode ? STRICT_PHRASE : NORMAL_PHRASE;

    const handleConfirm = () => {
        if (input !== PHRASE) {
            setError(`Type exactly: ${PHRASE}`);
            return;
        }
        onConfirm();
    };

    return (
        <div className="confirm-overlay">
            <div className={strictMode ? 'confirm-modal confirm-modal-strict' : 'confirm-modal'}>
                <div className="confirm-icon">{strictMode ? '🚨' : '🔒'}</div>
                <h3 className="confirm-title">
                    {strictMode ? 'Strict Mode Active' : 'Are you sure?'}
                </h3>
                <p className="confirm-desc">
                    You're trying to {action} during an active block. Type the phrase below to confirm.
                </p>
                <p className={strictMode ? 'confirm-phrase confirm-phrase-strict' : 'confirm-phrase'}>
                    {PHRASE}
                </p>
                <input
                    className="glass-input"
                    type="text"
                    value={input}
                    onChange={e => {
                        setInput(e.target.value);
                        setError('');
                    }}
                    onPaste={e => {
                        e.preventDefault();
                        setError('Pasting is not allowed. Type the phrase manually.');
                    }}
                    onCopy={e => e.preventDefault()}
                    onCut={e => e.preventDefault()}
                    placeholder="Type the phrase above"
                    style={{ width: '100%', marginBottom: 16 }}
                    autoFocus
                />
                {error && <p className="confirm-error">{error}</p>}
                <button className="confirm-btn-confirm" onClick={handleConfirm}>
                    Confirm
                </button>
                <button className="confirm-btn-cancel" onClick={onCancel}>
                    Cancel — Keep Blocking
                </button>
            </div>
        </div>
    );
}

export default ConfirmPhrase;
