export const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one symbol');
    }

    if (/(.)\1{3,}/.test(password)) {
        errors.push('Password cannot contain more than 3 consecutive identical characters');
    }

    for (let i = 0; i < password.length - 3; i++) {
        const charCode1 = password.charCodeAt(i);
        const charCode2 = password.charCodeAt(i + 1);
        const charCode3 = password.charCodeAt(i + 2);
        const charCode4 = password.charCodeAt(i + 3);

        if (charCode2 === charCode1 + 1 &&
            charCode3 === charCode1 + 2 &&
            charCode4 === charCode1 + 3) {
                errors.push('Password cannot contain more than 3 consecutive sequential characters (e.g. abcd, 1234)');
                break;
        }
    }

    return errors;
};