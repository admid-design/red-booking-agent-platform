# red-booking-agent-platform
AI-powered booking platform with conversational agents

## Test call endpoint

You can trigger a test phone call with:

```bash
curl -X POST http://localhost:3000/voice/test-call \
  -H "Content-Type: application/json" \
  -d '{"toNumber":"+15555550123"}'
```
