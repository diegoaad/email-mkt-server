const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Import the marketing route
const marketingRoutes = require('./routes/marketing');

app.use(express.json());

// Use the marketing route
app.use('/marketing-option', marketingRoutes);

app.get('/', (req, res) => {
    res.send('Hello, Node.js!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});