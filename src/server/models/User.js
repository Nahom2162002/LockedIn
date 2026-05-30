import { Schema, model } from 'mongoose';
import { type } from 'node:os';

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true},
    password: { type: String, required: true, unique: true },
    passwordHistory: { type: [String], required: true},
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

export default model('User', userSchema);