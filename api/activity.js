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
    const { id } = req.query;
    const tokens = JSON.parse(req.query.tokens || '{}');

    if (!tokens.oauth1 || !tokens.oauth2) {
      return res.status(401).json({ error: 'Tokens required' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Activity ID required' });
    }

    // Create client with empty credentials object
    const garminClient = new GarminConnect({});
    garminClient.loadToken(tokens.oauth1, tokens.oauth2);

    const activity = await garminClient.getActivity({ activityId: id });

    res.json({ success: true, activity });
  } catch (error) {
    console.error('Error fetching activity details:', error);
    res.status(500).json({ error: 'Failed to fetch activity details' });
  }
};

