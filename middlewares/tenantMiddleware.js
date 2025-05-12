const { getTenantDb } = require('../config/tDb'); // Ensure this path is correct
   
const TransactionSchema = require('../models/Transaction'); // Import the schema
const LogSchema = require('../models/logs'); // Import the schema
const calogSchema=require('../models/calog');
   module.exports = async function tenantMiddleware(req, res, next) {
       try {
           if (!req.user || !req.user.username) {
               return res.status(401).json({ message: 'Unauthorized: No user information' });
           }

           const dbName = req.user.username;
           const db = getTenantDb(dbName);

           req.db = db;

           // Ensure you are using the schema correctly
           req.Transaction = db.model('Transaction', TransactionSchema);
           req.Log = db.model('Log', LogSchema);
           req.calog = db.model('calogs', calogSchema);
           next();
       } catch (error) {
           console.error('Tenant middleware error:', error);
           res.status(500).json({ message: 'Tenant resolution failed' });
       }
   };