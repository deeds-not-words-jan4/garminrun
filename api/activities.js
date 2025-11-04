const { GarminConnect } = require('garmin-connect');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Activities API called ===');
    const tokens = JSON.parse(req.query.tokens || '{}');
    console.log('Tokens parsed:', { hasOauth1: !!tokens.oauth1, hasOauth2: !!tokens.oauth2 });

    if (!tokens.oauth1 || !tokens.oauth2) {
      console.log('Missing tokens');
      return res.status(401).json({ error: 'Tokens required' });
    }

    // Create client with empty credentials object
    const garminClient = new GarminConnect({});
    console.log('GarminConnect client created');

    console.log('Loading tokens...');
    garminClient.loadToken(tokens.oauth1, tokens.oauth2);
    console.log('Tokens loaded successfully');

    const limit = parseInt(req.query.limit) || 10;
    const start = parseInt(req.query.start) || 0;
    console.log('Fetching activities:', { start, limit });

    const activities = await garminClient.getActivities(start, limit);
    console.log('Activities fetched:', activities.length);

    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch activities', details: error.message });
  }
};

