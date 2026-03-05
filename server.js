const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'RED Booking Agent Platform',
        version: '1.0.0',
    });
});

// Voice - Incoming call
app.post('/voice/incoming', (req, res) => {
    console.log('📞 Incoming call received');
    console.log('Call SID:', req.body.CallSid);
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">Welcome to RED Concierge Booking. I can help you arrange a professional companion for your event. What date and time are you looking for?</Say>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
});

// Voice - Handle input
app.post('/voice/handle-input', (req, res) => {
    console.log('🎤 User input received');
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">Great! I found several available companions. Let me search for the best options for you.</Say>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
});

// Voice - Call status
app.post('/voice/status', (req, res) => {
    console.log(`📞 Call status: ${req.body.CallStatus}`);
    console.log('Call SID:', req.body.CallSid);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/health`);
    console.log(`📞 Voice: http://localhost:${PORT}/voice/incoming`);
});
