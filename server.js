require('dotenv').config();
const app = require('./app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Utunyange School running on http://localhost:${PORT}`);
  try {
    await db.testConnection();
    console.log('Database connected.');
  } catch (err) {
    console.warn(`Database not reachable: ${err.message}`);
    console.warn('Start MySQL (XAMPP), then run:  npm run db:setup');
  }
});
