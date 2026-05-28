import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import crypto from 'crypto';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) {
            return res.status(400).json({ error: 'Account already exits' });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword 
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

        const resetUrl = `chrome-extension://bhkgkhhdenaaeoiflaonmmpojndbpkam/index.html#/reset-password?token=${resetToken}`;

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
    const token = req.params.token;

    const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return res.send('<h1>Invalid or expired reset link</h1>');
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reset Password - LockedIn</title>
            <style>
                body {
                    font-family: sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #1a1a2e;
                    color: white;
                }
                .container {
                    background: #16213e;
                    padding: 40px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    width: 300px;
                }
                input {
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    font-size: 14px;
                }
                button {
                    padding: 10px;
                    border-radius: 6px;
                    border: none;
                    background: #4CAF50;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                }
                button:hover { background: #45a049; }
                #message { color: #4CAF50; }
                #error { color: red; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Reset Password</h2>
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
                        error.textContent = "Please fill in all fields";
                        return;
                    }

                    if (password !== confirmpassword) {
                        error.textContent = "Passwords do not match";
                        return;
                    }

                    const response = await fetch('/auth/reset-password/${token}', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password })
                    });
                    const data = await response.json();
                    if (data.message) {
                        message.textContent = "Password reset successful! You can now log in.";
                        error.textContent = '';
                    } else {
                        error.textContent = data.error;
                    }
                }
            </script>
        </body>
        </html>
    `);
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

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
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