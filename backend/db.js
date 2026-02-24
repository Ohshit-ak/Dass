const mongoose = require('mongoose');

function connect_db() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  mongoose.connect(uri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB error:', err);
      process.exit(1);
    });
}

module.exports = connect_db;