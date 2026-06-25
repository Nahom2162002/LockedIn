import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    passwordHistory: { type: [String], required: true },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    stripeCustomerId: { type: String }
});

export default mongoose.models.User || mongoose.model('User', userSchema);