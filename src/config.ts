export const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'test-account',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'test-token',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'test-key',
  },
  postgres: {
    connectionString: process.env.POSTGRES_CONNECTION_STRING || 'postgresql://localhost/red_db',
  },
};

export default config;
