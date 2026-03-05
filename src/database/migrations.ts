import { PoolClient } from 'pg';
import { getPool } from './database';

interface Migration {
  version: number;
  name: string;
  up: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    version: 2,
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255),
        email VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    `,
  },
  {
    version: 3,
    name: 'create_hostesses_table',
    up: `
      CREATE TABLE IF NOT EXISTS hostesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        bio TEXT,
        photo_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    version: 4,
    name: 'create_availability_table',
    up: `
      CREATE TABLE IF NOT EXISTS availability (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hostess_id UUID NOT NULL REFERENCES hostesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_booked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(hostess_id, date, start_time)
      );
      CREATE INDEX IF NOT EXISTS idx_availability_hostess ON availability(hostess_id);
      CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);
    `,
  },
  {
    version: 5,
    name: 'create_conversations_table',
    up: `
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        call_sid VARCHAR(64) NOT NULL UNIQUE,
        user_id UUID REFERENCES users(id),
        phone_number VARCHAR(20) NOT NULL,
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'completed', 'failed', 'transferred')),
        transcript JSONB NOT NULL DEFAULT '[]',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        duration_seconds INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_call_sid ON conversations(call_sid);
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
    `,
  },
  {
    version: 6,
    name: 'create_bookings_table',
    up: `
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        hostess_id UUID REFERENCES hostesses(id),
        availability_id UUID REFERENCES availability(id),
        conversation_id UUID REFERENCES conversations(id),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        guest_count INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'confirmed', 'deposit_paid', 'completed', 'cancelled', 'no_show')),
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_hostess ON bookings(hostess_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    `,
  },
  {
    version: 7,
    name: 'create_payments_table',
    up: `
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        stripe_payment_intent_id VARCHAR(255),
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'usd',
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
        type VARCHAR(10) NOT NULL CHECK (type IN ('deposit', 'final', 'refund')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
      CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Ensure the migrations table exists first
    await client.query(migrations[0].up);

    const appliedResult = await client.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(appliedResult.rows.map((r) => r.version));

    for (const migration of migrations.slice(1)) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      console.log(`Running migration ${migration.version}: ${migration.name}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.up);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
        await client.query('COMMIT');
        console.log(`  ✓ Migration ${migration.version} applied`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('All migrations complete');
  } finally {
    client.release();
  }
}
