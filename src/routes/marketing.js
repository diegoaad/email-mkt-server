const express = require('express');
const router = express.Router();

const axios = require('axios');

const SHOP = 'ryodevstore';
const API_KEY = 'f5a3c4c5d1774c0105ca510200ae8918';
const SHARED_SECRET = 'f7d651e2c7bc3d27f9d087e473e01de4';
const REDIRECT_URI = 'http://localhost:3000/marketing-option/token';


// In-memory store for email preferences and Shopify tokens
const emailPreferences = {};
let shopifyToken = '';

// Routes

// GET: Redirect user to Shopify authorization URL
router.get('/auth', (req, res) => {
    const authUrl = `https://${SHOP}.myshopify.com/admin/oauth/authorize?client_id=${API_KEY}&scope=customer_read_customers,customer_write_customers,read_customers,write_customers&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    res.redirect(authUrl);
});

// GET: Handle the callback with the authorization code
router.get('/token', async (req, res) => {
    const { code, hmac } = req.query;

    if (!code || !hmac) {
        return res.status(400).json({ message: 'Missing code or hmac in query parameters.' });
    }

    try {
        // Exchange the code for an access token
        const response = await axios.post(`https://${SHOP}.myshopify.com/admin/oauth/access_token`, {
            client_id: API_KEY,
            client_secret: SHARED_SECRET,
            code: code,
        });

        const { access_token } = response.data;

        // Persist the access token
        shopifyToken = access_token;

        res.status(200).json({ message: 'Access token retrieved and stored successfully.', access_token });
    } catch (error) {
        console.error('Error exchanging code for access token:', error.message);
        res.status(500).json({ message: 'Failed to retrieve access token.', error: error.message });
    }
});

// GET: Fetch email preference for a contact email
router.get('/customersList', async (req, res) => {
    const accessToken = shopifyToken;

    if (!accessToken) {
        return res.status(403).json({ message: 'Access token is missing. Please authenticate using /auth and /token routes.' });
    }

    try {
        // Await the axios call to resolve the promise
        const response = await axios.get(`https://${SHOP}.myshopify.com/admin/api/2025-01/customers/count.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        console.log('Shopify Response:', response.data); // Log the correct parsed data

        // Return the parsed response
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching customers from Shopify:', error.message);
        res.status(500).json({ message: 'Failed to fetch customers.', error: error.message });
    }
});

// GET: Fetch email preference for a contact email
router.get('/marketing-option/:contact_email', (req, res) => {
    const { contact_email } = req.params;
    const preference = emailPreferences[contact_email];

    if (!preference) {
        return res.status(404).json({ message: `No marketing preference found for contact_email: ${contact_email}` });
    }

    res.json({ contact_email, ...preference });
});

// POST: Create or update marketing preference for a contact email
router.post('/marketing-option', (req, res) => {
    const input = req.body;

    if (!Array.isArray(input)) {
        return res.status(400).json({ message: 'Input must be an array of objects.' });
    }

    input.forEach((item) => {
        const { contact_email, propertyName, propertyValue } = item;

        if (!contact_email || !propertyName || !propertyValue) {
            return res.status(400).json({ message: 'Each object must contain contact_email, propertyName, and propertyValue.' });
        }

        if (propertyName !== 'accepts_marketing') {
            return res.status(400).json({ message: 'propertyName must be "accepts_marketing".' });
        }

        if (!['true', 'false'].includes(propertyValue)) {
            return res.status(400).json({ message: 'propertyValue must be "true" or "false".' });
        }

        emailPreferences[contact_email] = { [propertyName]: propertyValue };
    });

    res.status(201).json({ message: 'Marketing preferences processed successfully.' });
});

module.exports = router;