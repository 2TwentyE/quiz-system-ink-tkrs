const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false }
});

module.exports = {
  async query(text, params) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('Database error:', err);
      throw err;
    }
  }
};
