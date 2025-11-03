const express = require('express');
const { GarminConnect } = require('garmin-connect');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'garmin-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using HTTPS
}));

// Garmin Connect instance
let garminClient = null;

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    garminClient = new GarminConnect({
      username: email,
      password: password
    });

    await garminClient.login();
    req.session.loggedIn = true;

    res.json({ success: true, message: 'Successfully logged in to Garmin Connect' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Login failed. Please check your credentials.' });
  }
});

// Get activities endpoint
app.get('/api/activities', async (req, res) => {
  try {
    if (!garminClient || !req.session.loggedIn) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const start = parseInt(req.query.start) || 0;

    const activities = await garminClient.getActivities(start, limit);

    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activity details
app.get('/api/activity/:id', async (req, res) => {
  try {
    if (!garminClient || !req.session.loggedIn) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const activityId = req.params.id;
    const activity = await garminClient.getActivity({ activityId });

    res.json({ success: true, activity });
  } catch (error) {
    console.error('Error fetching activity details:', error);
    res.status(500).json({ error: 'Failed to fetch activity details' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  garminClient = null;
  res.json({ success: true, message: 'Logged out successfully' });
});

// Check session status
app.get('/api/status', (req, res) => {
  res.json({ loggedIn: !!req.session.loggedIn });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
