// src/config.ts

const config = {
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },
    postgres: {
        connectionString: process.env.POSTGRES_CONNECTION_STRING,
    },
};

export default config;
