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
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
        }}>
            <div style={{
                animation: 'fadeInUp 0.8s ease-out forwards',
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 320,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}>
                <p style={{ fontSize: 24, textAlign: 'center', margin: 0 }}>{strictMode ? '🚨' : '🔒'}</p>
                <h3 style={{ color: 'white', textAlign: 'center', margin: 0, fontSize: 16 }}>
                    {strictMode ? 'Strict Mode Active' : 'Are you sure?'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', margin: 0 }}>
                    You're trying to {action} during an active block.
                    Type the phrase below to confirm.
                </p>
                <p style={{
                    color: '#0099ff',
                    fontWeight: 700,
                    textAlign: 'center',
                    fontSize: 14,
                    letterSpacing: '0.05em',
                    margin: 0
                }}>
                    {PHRASE}
                </p>
                <input type="text" value={input} onChange={e => {
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
                style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.07)',
                    color: 'white',
                    fontSize: 13,
                    outline: 'none'
                }}
                autoFocus 
                />
                {error && <p style={{ color: '#ff4d4d', fontSize: 11, margin: 0, textAlign: 'center' }}>{error}</p>}
                <button onClick={handleConfirm} style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#ff4d4d',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13
                }}
                >
                    Confirm 
                </button>
                <button onClick={onCancel} style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: 13
                }}
                >
                    Cancel - Keep Blocking 
                </button>
            </div>
        </div>
    );
}

export default ConfirmPhrase;