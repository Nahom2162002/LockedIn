interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
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
                <h3 style={{ color: 'white', textAlign: 'center', margin: 0, fontSize: 16 }}>
                    {title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', margin: 0 }}>
                    {message}
                </p>
                <button onClick={onConfirm} style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    background: danger ? '#ff4d4d' : 'linear-gradient(135deg, #0099ff, #0055ff)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13
                }}
                >
                    {confirmLabel}
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
                    {cancelLabel}
                </button>
            </div>
        </div>
    );
}

export default ConfirmDialog;
