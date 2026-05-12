import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import websiteRoutes from './routes/websites.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'chrome-extension://bhkgkhhdenaaeoiflaonmmpojndbpkam'
}));

mongoose.connect(process.env.MONGODB_URI || '', {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Connection error:', err));

app.use('/websites', websiteRoutes);

app.listen(3001, () => console.log('Server running on port 3001'));