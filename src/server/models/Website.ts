import mongoose, { Schema } from 'mongoose';

const websiteSchema = new Schema({
    userId: { type: String, required: true },
    url: { type: String },
    dateCreated: { type: Date, required: false },
    startTime: { type: String },
    endTime: { type: String }
});

export default mongoose.models.Website || mongoose.model('Website', websiteSchema);

/*
import { Schema, model } from 'mongoose';

const websiteSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    url: String,
    dateCreated: { type: Date, required: false },
    startTime: String,
    endTime: String 
});

const Website = model('Website', websiteSchema);

export default Website;*/