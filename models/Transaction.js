const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerName: { type: String, required: true },
  jewelType: { type: String, enum: ['gold', 'silver'] },
  father: String,
  jewelName: String,
  village: String,
  sirname: String,
  amountGiven: Number,
  weight:Number,
  tanch:Number,
  contact: Number,
  date: { type: Date, required: true },
  amount1:{ type: Number, default:0},
  date1:{ type: Date},
  amount2:{ type: Number, default:0},
  date2:{ type: Date},
  amount3:{ type: Number, default:0},
  date3:{ type: Date},
  remaininterest: {type: Number, default:0},
   });

module.exports = transactionSchema; // Ensure this line is present