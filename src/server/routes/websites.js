import express from 'express';
import Website from '../models/Website.js';

const router = express.Router();

router.post('/', async (req, res) => {
    console.log(req.body);
    try {
        const parsedDate = req.body.dateCreated ? new Date(req.body.dateCreated): null;

        const website = new Website({
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

export default router;