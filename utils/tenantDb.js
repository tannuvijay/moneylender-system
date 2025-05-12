// utils/tenantDb.js
const mongoose = require('mongoose');
const transactionSchema = require('../models/Transaction'); // Import your transaction schema

// Object to store connections per owner (tenant).
const connections = {};

// Connect to the database for a specific tenant (ownerId).
async function getTransactionModel(ownerDb, ownerDbName) {
  // Check if the connection for this owner already exists
  if (connections[ownerDbName]) {
    return connections[ownerDbName].model('Transaction', transactionSchema);
  }

  // Create a connection for this owner
  const conn = ownerDb; // We already have the connection as ownerDb
  connections[ownerDbName] = conn;

  // Ensure the schema is used correctly
  const transactionModel = conn.model('Transaction', transactionSchema);

  return transactionModel;
}

module.exports = { getTransactionModel };
