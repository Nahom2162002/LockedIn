import { Schema, model } from 'mongoose';

const websiteSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    url: String,
    dateCreated: { type: Date, required: false },
    startTime: String,
    endTime: String 
});

const Website = model('Website', websiteSchema);

export default Website;