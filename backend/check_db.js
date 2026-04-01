const pool = require('./config/db');

async function check() {
  try {
    const res = await pool.query('SELECT id, email, role FROM users');
    console.log('USERS IN DB:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('DB ERROR:', err.message);
    process.exit(1);
  }
}

check();
