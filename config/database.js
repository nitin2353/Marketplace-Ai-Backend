const { Pool } = require('pg');
const { dbConfig } = require('./db.config');

const pool = new Pool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
});

// Optional: Test connection once
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => console.error('❌ DB Connection Error:', err));

module.exports = pool;