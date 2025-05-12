const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  customerName: String,
  FatherName: String,
  Sirname: String,
  Village: String,
  jewelType: String,
  jewelName: String,
  amountGiven: Number,
  weight:Number,
  tanch:Number,
  originalDate: Date,
  contactNumber: Number,
  interestRateUsed: Number,
  interestAmount: Number,
  archivedAt: { type: Date, default: Date.now },
});

module.exports = logSchema; // Ensure this line is present
