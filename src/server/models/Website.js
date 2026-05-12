import { Schema, model } from 'mongoose';

const websiteSchema = new Schema({
    url: String,
    dateCreated: { type: Date, required: false },
    startTime: String,
    endTime: String 
});

const Website = model('Website', websiteSchema);

export default Website;