const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticateUser } = require('../middleware/auth');

// Get user status
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit CodeChef username (generates verification hex)
router.post('/submit-codechef', authenticateUser, async (req, res) => {
  try {
    const { codechefUsername } = req.body;

    if (!codechefUsername) {
      return res.status(400).json({ error: 'CodeChef username is required' });
    }

    const user = await User.findById(req.userId);

    // ✅ STRICT STATE GUARD
    if (user.status !== 'NONE') {
      return res.status(400).json({ error: 'Invalid state' });
    }

    // Check if CodeChef username is already claimed by another verified user
    const existingUser = await User.findOne({
      codechefUsername,
      status: 'VERIFIED'
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'This CodeChef username is already verified by another account'
      });
    }

    // Generate verification hex
    const verificationHex = crypto.randomBytes(16).toString('hex');

    user.codechefUsername = codechefUsername;
    user.verificationHex = verificationHex;
    user.status = 'NONE';
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'CodeChef username saved. Please submit your solution.',
      verificationHex,
      codechefUsername
    });

  } catch (error) {
    console.error('Submit CodeChef error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit submission ID
router.post('/submit-solution', authenticateUser, async (req, res) => {
  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Submission ID is required' });
    }

    const user = await User.findById(req.userId);

    // ✅ STRICT STATE GUARD
    if (user.status !== 'NONE') {
      return res.status(400).json({ error: 'Invalid state' });
    }

    if (!user.codechefUsername || !user.verificationHex) {
      return res.status(400).json({
        error: 'Please submit CodeChef username first'
      });
    }

    user.submissionId = submissionId;
    user.status = 'PENDING';
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'Submission ID saved. Waiting for admin verification.',
      status: 'PENDING'
    });

  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set password (only after verification)
router.post('/set-password', authenticateUser, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.userId);

    if (user.status !== 'VERIFIED') {
      return res.status(400).json({
        error: 'Account must be verified before setting password'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.passwordSet = true;
    user.updatedAt = new Date();

    await user.save();

    res.json({ message: 'Password set successfully' });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password (only for verified users)
router.post('/change-password', authenticateUser, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.userId);

    if (user.status !== 'VERIFIED') {
      return res.status(400).json({
        error: 'Account must be verified before changing password'
      });
    }

    if (!user.password) {
      return res.status(400).json({
        error: 'No password set. Please set a password first.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordSet = true;
    user.updatedAt = new Date();

    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delink CodeChef username
router.post('/delink-codechef', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.codechefUsername) {
      return res.status(400).json({
        error: 'No CodeChef account linked'
      });
    }

    user.codechefUsername = null;
    user.verificationHex = null;
    user.submissionId = null;
    user.status = 'NONE';
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'CodeChef account delinked successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        codechefUsername: user.codechefUsername
      }
    });

  } catch (error) {
    console.error('Delink CodeChef error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset verification (only for REJECTED users)
router.post('/reset-verification', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (user.status !== 'REJECTED') {
      return res.status(400).json({
        error: 'Only rejected verification can be reset'
      });
    }

    user.codechefUsername = null;
    user.verificationHex = null;
    user.submissionId = null;
    user.status = 'NONE';
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'Verification reset. You can now try again.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        codechefUsername: user.codechefUsername
      }
    });

  } catch (error) {
    console.error('Reset verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
