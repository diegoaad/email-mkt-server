const express = require('express');
const router = express.Router();

// In-memory store for email preferences
const emailPreferences = {};

const { Shopify } = require('@shopify/shopify-api');

// Configure Shopify API
const shopify = new Shopify.Clients.Rest('ryoloja.myshopify.com', 'your-access-token');


// Example route for marketing options
router.get('/', (req, res) => {
    res.send('Marketing options endpoint');
});

// GET: Fetch email preference for a user
router.get('/:contact_email', (req, res) => {
    const { contact_email } = req.params;
    const preference = emailPreferences[contact_email];

    if (!preference) {
        return res.status(404).json({ message: `No marketing preference found for contact_email: ${contact_email}` });
    }

    res.json({ contact_email, ...preference });
});

// POST: Create email preference for a user
router.post('/', (req, res) => {
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

         // Sync with Shopify
         const customers = await shopify.get({
            path: 'customers/search',
            query: { query: `email:${contact_email}` },
        });

        const customer = customers.body.customers[0];
        if (!customer) {
            console.error(`Customer not found: ${contact_email}`);
            continue;
        }

        await shopify.put({
            path: `customers/${customer.id}`,
            data: {
                customer: {
                    id: customer.id,
                    email: contact_email,
                    accepts_marketing: propertyValue === 'true',
                },
            },
            type: 'application/json',
        });
    });

    res.status(201).json({ message: 'Marketing preferences processed successfully.' });
});

module.exports = router;