import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'RED Booking Agent Platform',
        version: '1.0.0',
    });
});

export default router;
