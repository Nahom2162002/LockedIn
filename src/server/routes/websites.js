import express from 'express';
import Website from '../models/Website.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const websites = await Website.find({ userId: req.query.userId });
        res.json(websites);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    console.log(req.body);
    try {
        const parsedDate = req.body.dateCreated ? new Date(req.body.dateCreated): null;

        const website = new Website({
            userId: req.body.userId,
            url: req.body.url,
            dateCreated: parsedDate,
            startTime: req.body.startTime,
            endTime: req.body.endTime
        });
        await website.save();
        res.json({ message: 'Website added!', website });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const website = await Website.findByIdAndUpdate(
            req.params.id,
            {
                url: req.body.url,
                dateCreated: new Date(req.body.dateCreated),
                startTime: req.body.startTime,
                endTime: req.body.endTime 
            },
            { new: true }
        );
        res.json(website);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Website.findByIdAndDelete(req.params.id);
        res.json({ message: 'Website deleted!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;