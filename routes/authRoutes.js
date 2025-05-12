const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/', (_, res) => res.render('auth/login'));
router.post('/login', authController.login);
router.get('/signup', (_, res) => res.render('auth/signup'));
router.post('/signup', authController.signup);
router.get('/logout', authController.logout);

router.get('/forgot-password', authController.showForgotPasswordForm);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
