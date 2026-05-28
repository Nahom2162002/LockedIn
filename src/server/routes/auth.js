import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
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

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const resetUrl = `https://lockedin-jovk.onrender.com/auth/reset-password/${resetToken}`;

        await transporter.sendMail({
            from: process.env.EMAIL,
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

        res.json({ message: 'Password reset email sent!' });
    } catch (err) {
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