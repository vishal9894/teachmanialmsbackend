const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

async function connectDB() {
    try {
        const client = await pool.connect();
        console.log("PostgreSQL Connected Successfully ");

    } catch (error) {
        console.error("PostgreSQL connection error ", error.message);
        process.exit(1);
    }
}

module.exports = { pool, connectDB };