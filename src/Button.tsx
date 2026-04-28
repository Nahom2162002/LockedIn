import Menu from './Menu.tsx';

function Button() {
    return (
        <>
        <button onClick={GoToMenu}>Click here to get started</button>
        </>
    )
}

function GoToMenu() {
    return (
        <>
        <Menu/>
        </>
    )
}

export default Button;