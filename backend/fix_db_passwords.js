const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function fixPasswords() {
  try {
    const validHash = await bcrypt.hash('admin123', 10);
    console.log('New valid hash for admin123:', validHash);
    
    // Test it just in case
    const isMatch = await bcrypt.compare('admin123', validHash);
    console.log('Does it match?', isMatch);

    const res = await pool.query('UPDATE users SET password = $1', [validHash]);
    console.log(`Updated ${res.rowCount} users with the correct password hash.`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error updating passwords:', err.message);
    process.exit(1);
  }
}

fixPasswords();
