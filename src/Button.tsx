import Menu from './Menu.tsx';
import { useState } from 'react';

function Button() {
    const [showMenu, setShowMenu] = useState(false);

    if (showMenu) {
        return <Menu />;
    }

    return (
        <>
        <button onClick={() => setShowMenu(true)}>Click here to get started</button>
        </>
    )
}

export default Button;