const Owner = require('../models/Owner');
const bcrypt = require('bcrypt');

exports.signup = async (req, res) => {
  const { name, number, password } = req.body;
  const owner = await Owner.findOne({ number });
  if(!owner){
  const dbName = `bank_${number}`;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Save owner to main DB
    await Owner.create({ name, number, password: hashedPassword, dbName });
    res.redirect('/');
  } catch (err) {
    console.error("Signup error:", err);
    res.send('Signup failed. Maybe Number already exists.');
  }
}
else{
  res.send("Already Registered");
}
};

exports.login = async (req, res) => {
  const { number, password } = req.body;

  const owner = await Owner.findOne({ number });
  if (!owner) return res.send('Number not registered');

  const isMatch = await bcrypt.compare(password, owner.password);
  if (!isMatch) return res.send('Invalid password');

  req.session.ownerId = owner._id;
  req.session.dbName = owner.dbName;
  req.session.ownerName = owner.name;

  // Set req.user for tenantMiddleware
  req.user = { username: owner.dbName }; // Ensure this line is present

  res.redirect('/dashboard');
};


exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};




exports.showForgotPasswordForm = (req, res) => {
  res.render('forgot-password');
};

exports.resetPassword = async (req, res) => {
  try {
    const { name, number, newPassword } = req.body;

    const owner = await Owner.findOne({ name, number });
    if (!owner) {
      return res.send('Owner not found. Please check your name and contact number.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    owner.password = hashedPassword;
    await owner.save();

    res.send('Password reset successful. <a href="/">Go to login</a>');
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).send('An error occurred while resetting password.');
  }
};

