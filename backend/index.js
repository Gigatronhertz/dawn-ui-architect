require('dotenv').config();
const express = require('express');
const webhookRouter = require('./webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'MySquadGo backend' }));

// All webhook + payment routes
app.use('/', webhookRouter);

// Unhandled errors don't crash the process
process.on('uncaughtException', (err) => console.error('[uncaught]', err.message));
process.on('unhandledRejection', (err) => console.error('[unhandled]', err?.message || err));

app.listen(PORT, () => {
  console.log(`\n🚀 MySquadGo backend running on port ${PORT}`);
  console.log(`   Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`   (expose with: ngrok http ${PORT})\n`);
});
