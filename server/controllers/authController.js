const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const storage = require('../models/storage');
const config = require('../config/config');

/**
 * Register a new user
 */
exports.register = (req, res) => {
  try {
    const { name, email, password, role = 'walker', walkingSpeed = 'moderate', preferences } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const authorizedAdminEmails = ['admin@ecowalk.local', 'rakshithmr52@gmail.com'];
    const assignedRole = (role === 'admin' && authorizedAdminEmails.includes(normalizedEmail)) ? 'admin' : 'walker';

    const salt = bcrypt.genSaltSync(8);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: `U-${uuidv4().substring(0, 8).toUpperCase()}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      walkingSpeed: ['leisurely', 'moderate', 'brisk'].includes(walkingSpeed) ? walkingSpeed : 'moderate',
      preferences: preferences || {
        prioritizeGreenery: true,
        prioritizeSafety: true,
        avoidPollution: true,
        avoidPotholes: true,
        importanceWeights: {
          greenery: 0.35,
          safety: 0.25,
          airQuality: 0.25,
          roadCondition: 0.15
        }
      },
      stats: {
        totalDistanceKm: 0,
        totalWalks: 0,
        totalCalories: 0,
        co2SavedKg: 0,
        reportsSubmitted: 0
      },
      createdAt: new Date().toISOString()
    };

    storage.createUser(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      message: 'Registration successful!',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

/**
 * Login user
 */
exports.login = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      message: 'Login successful!',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
};

/**
 * Get current authenticated user profile
 */
exports.getProfile = (req, res) => {
  try {
    const user = storage.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const { passwordHash: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
};

/**
 * Update user preferences & walking speed
 */
exports.updatePreferences = (req, res) => {
  try {
    const { walkingSpeed, preferences } = req.body;
    const updatedUser = storage.updateUserPreferences(req.user.id, { walkingSpeed, preferences });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { passwordHash: _, ...safeUser } = updatedUser;
    return res.json({ message: 'Preferences updated successfully!', user: safeUser });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update preferences.' });
  }
};
