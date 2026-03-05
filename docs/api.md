# API Documentation

## Base URL

```
http://localhost:3000
```

In production, use your deployed domain or ngrok URL.

---

## Health Endpoints

### GET /health

Returns the health status of the application, including database connectivity.

**Response 200 (OK)**
```json
{
  "status": "ok",
  "timestamp": "2024-03-15T18:00:00.000Z",
  "uptime": 12345.67,
  "database": "connected"
}
```

**Response 503 (Service Unavailable)**
```json
{
  "status": "degraded",
  "timestamp": "2024-03-15T18:00:00.000Z",
  "uptime": 12345.67,
  "database": "disconnected"
}
```

### GET /health/ping

Simple liveness check with no database dependency.

**Response 200**
```json
{
  "pong": true,
  "timestamp": "2024-03-15T18:00:00.000Z"
}
```

---

## Voice Endpoints

These endpoints are called by Twilio, not directly by clients.

### POST /voice/incoming

Twilio webhook for inbound calls. Returns TwiML to connect call to Media Stream.

**Twilio Parameters** (form-encoded)
- `CallSid` - Twilio call identifier
- `From` - Caller's phone number
- `To` - Called number

**Response**: TwiML XML

### POST /voice/status

Twilio status callback for call lifecycle events.

**Twilio Parameters**
- `CallSid` - Call identifier
- `CallStatus` - `completed` | `failed` | `busy` | `no-answer`
- `CallDuration` - Duration in seconds

**Response**: 200 OK

### WebSocket /voice/stream/:callSid

Twilio Media Stream WebSocket endpoint. Not called directly by clients.

---

## Bookings Endpoints

### GET /bookings

List bookings with optional filters.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending`, `confirmed`, `deposit_paid`, `completed`, `cancelled`, `no_show` |
| `date` | string | Filter by date (YYYY-MM-DD) |
| `userId` | string | Filter by user UUID |

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "hostessId": "uuid",
      "date": "2024-03-15",
      "startTime": "18:00",
      "endTime": "20:00",
      "guestCount": 4,
      "status": "confirmed",
      "totalAmount": 140.00,
      "depositAmount": 28.00,
      "notes": "Birthday celebration",
      "createdAt": "2024-03-10T12:00:00Z",
      "updatedAt": "2024-03-10T12:00:00Z"
    }
  ]
}
```

### POST /bookings

Create a new booking.

**Request Body**
```json
{
  "date": "2024-03-15",
  "startTime": "18:00",
  "endTime": "20:00",
  "guestCount": 4,
  "phoneNumber": "+15555550100",
  "hostessId": "uuid",
  "availabilityId": "uuid",
  "notes": "Birthday celebration"
}
```

**Required fields**: `date`, `startTime`, `endTime`, `guestCount`, `phoneNumber`

**Response 201**
```json
{
  "data": {
    "id": "uuid",
    "status": "pending",
    "depositAmount": 28.00,
    "totalAmount": 140.00,
    ...
  }
}
```

**Response 400**
```json
{
  "error": "Missing required fields: date, startTime, endTime, phoneNumber"
}
```

### GET /bookings/:id

Get a specific booking by ID.

**Response 200**
```json
{
  "data": { ... }
}
```

**Response 404**
```json
{
  "error": "Booking not found"
}
```

### POST /bookings/:id/confirm

Confirm a pending booking.

**Response 200**
```json
{
  "message": "Booking confirmed"
}
```

**Response 400**
```json
{
  "error": "Booking <id> is not in pending status"
}
```

### POST /bookings/:id/cancel

Cancel a booking.

**Response 200**
```json
{
  "message": "Booking cancelled"
}
```

### GET /bookings/availability/:date

Get available time slots for a date.

**Path Parameters**
- `date` - Date in YYYY-MM-DD format

**Query Parameters**
- `hostessId` (optional) - Filter by hostess UUID

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "hostessId": "uuid",
      "date": "2024-03-15",
      "startTime": "18:00",
      "endTime": "20:00",
      "isBooked": false
    }
  ]
}
```

---

## Booking Status Lifecycle

```
pending → confirmed → deposit_paid → completed
                    ↘
                     cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Booking created, awaiting confirmation |
| `confirmed` | Booking confirmed, deposit pending |
| `deposit_paid` | Deposit received via Stripe |
| `completed` | Event completed |
| `cancelled` | Booking cancelled |
| `no_show` | Guest did not arrive |

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:
- `400` - Bad request (validation error)
- `404` - Resource not found
- `500` - Internal server error
