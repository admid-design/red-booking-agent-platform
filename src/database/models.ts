class Database {
    constructor() {
        console.log('Database initialized');
    }

    public async createTable(): Promise<void> {
        console.log('Tables created');
    }

    public async close() {
        console.log('Database closed');
    }
}

export default Database;
