require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Session configuration
app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  })
}));

// Middleware to set req.user from session
   app.use((req, res, next) => {
       if (req.session && req.session.dbName) {
           req.user = { username: req.session.dbName };
           console.log('User  info set:', req.user); // Debugging line
       } else {
           console.log('No user info in session'); // Debugging line
       }
       next();
   });
   

// Routes
app.use('/', authRoutes);
app.use('/', transactionRoutes); // Ensure this is prefixed with /transactions

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
