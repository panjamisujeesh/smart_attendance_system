const bcrypt = require('bcrypt');
const hash = '$2b$10$YGM1.6nk9.2YO8PniMWNhOIYp4glsYqnwSolPB1RiRQfkIg5e5g4u';

async function check() {
  const isMatch = await bcrypt.compare('admin123', hash);
  console.log('Does admin123 match hash?', isMatch);
}

check();
