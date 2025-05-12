const mongoose = require('mongoose');

const connections = {};  // Store tenant connections

function getTenantDb(dbName) {
  if (connections[dbName]) return connections[dbName];

  const uri = `mongodb://localhost:27017/${dbName}`;
  const conn = mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  connections[dbName] = conn;
  return conn;
}

function closeTenantDb(dbName) {
  if (connections[dbName]) {
    connections[dbName].close();
    delete connections[dbName];
  }
}

module.exports = { getTenantDb, closeTenantDb };

