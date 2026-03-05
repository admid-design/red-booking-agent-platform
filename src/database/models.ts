import { Pool } from 'pg';

class Database {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            user: 'your_user',
            host: 'localhost',
            database: 'your_database',
            password: 'your_password',
            port: 5432,
        });
    }

    // Method for creating tables
    public async createTable(): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await this.pool.query(query);
    }

    // Close the pool connection
    public async close() {
        await this.pool.end();
    }
}

export default Database;