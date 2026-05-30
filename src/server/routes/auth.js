import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import crypto from 'crypto';
import { validatePassword } from '../passwordValidator.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) {
            return res.status(400).json({ error: 'Account already exits' });
        }

        const passwordErrors = validatePassword(req.body.password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ error: passwordErrors[0] });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            passwordHistory: [hashedPassword]
        });
        await user.save();
        res.json({ message: 'Account created!', userId: user._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        res.json({ message: 'Login successful!', userId: user._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const resend = new Resend(process.env.RESEND_API_KEY);

/*
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});*/

router.post('/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).json({ error: 'No account found with that email' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000;

        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        const resetUrl = `https://lockedin-jovk.onrender.com/auth/reset-password/${resetToken}`;

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: user.email,
            subject: 'LockedIn Password Reset',
            html: `
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your LockedIn Account.</p>
                <p>Click the link below to reset your password. This link expires in 1 hour.</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
            `
        });

        if (error) {
            console.error("Resesnd error:", error);
            return res.status(500).json({ error: error.message });
        }

        console.log("Email send successfully:", data);
        res.json({ message: "Password reset email send!" });
    } catch (err) {
        console.error("Server error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/reset-password/:token', async (req, res) => {
    try {
        const token = req.params.token;
        console.log('Reset token received:', token);

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        console.log('User found:', user);

        if (!user) {
            return res.send('<h1>Invalid or expired reset link</h1>');
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reset Password - LockedIn</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Inter', sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        background-color: #0d0d0d;
                        background-image: radial-gradient(circle at 50% 50%, #1a1a2e, #0d0d0d);
                    }

                    .container {
                        background: rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(10px);
                        padding: 40px;
                        border-radius: 16px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        width: 360px;
                        box-shadow: 0 0 30px rgba(0, 150, 255, 0.1);
                    }

                    h2 {
                        color: white;
                        font-size: 24px;
                        font-weight: 600;
                        text-align: center;
                        margin-bottom: 8px;
                    }

                    .lock-icon {
                        font-size: 48px;
                        text-align: center;
                    }

                    input {
                        padding: 12px 16px;
                        border-radius: 8px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        background: rgba(255, 255, 255, 0.07);
                        color: white;
                        font-size: 14px;
                        outline: none;
                        transition: border 0.3s ease;
                    }

                    input::placeholder {
                        color: rgba(255, 255, 255, 0.4);
                    }

                    input:focus {
                        border: 1px solid rgba(0, 150, 255, 0.6);
                        box-shadow: 0 0 10px rgba(0, 150, 255, 0.2);
                    }

                    button {
                        padding: 12px;
                        border-radius: 8px;
                        border: none;
                        background: linear-gradient(135deg, #0099ff, #0055ff);
                        color: white;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: opacity 0.3s ease, transform 0.2s ease;
                        margin-top: 8px;
                    }

                    button:hover {
                        opacity: 0.9;
                        transform: translateY(-1px);
                    }

                    button:active {
                        transform: translateY(0);
                    }

                    #message {
                        color: #4CAF50;
                        font-size: 13px;
                        text-align: center;
                    }

                    #error {
                        color: #ff4d4d;
                        font-size: 13px;
                        text-align: center;
                    }
                    
                    .requirements {
                        font-size: 12px;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .requirement {
                        color: #ff4d4d;
                    }
                    .requirement.met {
                        color: #4CAF50;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="lock-icon">🔒</div>
                    <h2>Reset Password</h2>
                    <div class="requirements" id="requirements">
                        <p class="requirement" id="req-length">x At least 8 characters</p>
                        <p class="requirement" id="req-upper">x At least one uppercase letter</p>
                        <p class="requirement" id="req-lower">x At least one lowercase letter</p>
                        <p class="requirement" id="req-number">x At least one number</p>
                        <p class="requirement" id="req-symbol">x At least one symbol</p>
                        <p class="requirement" id="req-consecutive">x No more than 3 consecutive identical characters</p>
                    </div>
                    <input type="password" id="password" placeholder="New password"/>
                    <input type="password" id="confirmpassword" placeholder="Confirm new password"/>
                    <p id="error"></p>
                    <p id="message"></p>
                    <button onclick="resetPassword()">Reset Password</button>
                </div>
                <script>
                    async function resetPassword() {
                        const password = document.getElementById('password').value;
                        const confirmpassword = document.getElementById('confirmpassword').value;
                        const error = document.getElementById('error');
                        const message = document.getElementById('message');

                        if (!password || !confirmpassword) {
                            error.textContent = 'Please fill in all fields';
                            return;
                        }

                        if (password !== confirmpassword) {
                            error.textContent = 'Passwords do not match';
                            return;
                        }

                        const response = await fetch('https://lockedin-jovk.onrender.com/auth/reset-password/${token}', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password })
                        });
                        const data = await response.json();
                        if (data.message) {
                            message.textContent = 'Password reset successful! You can now log in.';
                            error.textContent = '';
                        } else {
                            error.textContent = data.error;
                            message.textContent = '';
                        }
                    }
                    document.getElementById('password').addEventListener('input', function() {
                        const password = this.value;

                        const updateReq = (id, met, text) => {
                            const el = document.getElementById(id);
                            el.textContent = (met ? '✓' : 'x') + text;
                            el.style.color = met ? '#4CAF50' : '#ff4d4d';
                        };

                        updateReq('req-length', password.length >= 8, 'At least 8 characters');
                        updateReq('req-upper', /[A-Z]/.test(password), 'At least one uppercase letter');
                        updateReq('req-lower', /[a-z]/.test(password), 'At least one lowercase letter');
                        updateReq('req-number', /[0-9]/.test(password), 'At least one number');
                        updateReq('req-symbol', /[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]/.test(password), 'At least one symbol');
                        updateReq('req-consecutive', !(/(.)\x01{3,}/.test(password)), 'No more than 3 consecutive identical characters'); 
                    });
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Reset passsword page error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const passwordErrors = validatePassword(req.body.password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ error: passwordErrors[0] });
        }

        const isSameAsCurrent = await bcrypt.compare(req.body.password, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({ error: 'New password cannot be the same as a previously used password' });
        }

        for (const oldPassword of user.passwordHistory) {
            const isSamePassword = await bcrypt.compare(req.body.password, oldPassword);
            if (isSamePassword) {
                return res.status(400).json({ error: 'New password cannot be the same as the previous one' });
            }
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        user.passwordHistory = [...user.passwordHistory, user.password];
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ message: 'Password reset successful!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;