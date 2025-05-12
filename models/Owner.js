const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dbName: { type: String, required: true }
});

module.exports = mongoose.model('Owner', ownerSchema);