import express from 'express';
import bodyParser from 'body-parser';
import voiceRoutes from './routes/voice';
import healthRoutes from './routes/health';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/voice', voiceRoutes);
app.use('/', healthRoutes);

async function start() {
    console.log('🚀 Starting RED Booking Agent Platform...');
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📡 Webhook ready at http://localhost:${PORT}/voice`);
    });
}

start();
