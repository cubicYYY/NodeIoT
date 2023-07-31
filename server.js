const express = require('express');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();

const utils = require('./utils.js');
const constants = require('./constants.js');

// Define the column names and types as an object
const table_name = 'users';
const columns = {
  id: 'INTEGER',
  name: 'TEXT',
  email: 'TEXT'
};

// Create a new database connection, and try to init it.
const db = new sqlite3.Database(constants.DB_FILE_NAME);

// Create Express application
const app = express();

// Define a route handler for the /upload path
const UPLOAD_PATH = '/upload/:site/:sensor$'
const minuteLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 requests per minute
  message: "Too many requests in 60s.",
});

const burstLimit = rateLimit({
  windowMs: 3000, // 3s
  max: 5, // Limit to 5 requests
  message: "Slow down...",
});

app.use(UPLOAD_PATH, minuteLimit);
app.use(UPLOAD_PATH, burstLimit);
app.all(UPLOAD_PATH, (req, res) => {
  console.log(req.params);
  // Verify token
  let token = null;
  if (typeof req.headers['x-upload-token'] === 'string') {
    token = req.headers['x-upload-token'];
  } else {
    token = req.query.token;
  }
  if (token !== '114514') {
    res.status(401).send('Invalid token or token is not provided.');
    return;
  }

  const site = req.params.site;
  const sensor = req.params.sensor;
  let ctx = new utils.SensorContext(site, sensor);
  // Generate random data for demo
  const data = {
    value1: Math.random(),
    value2: Math.random(),
    value3: Math.random(),
  };

  // Send JSON response with random data
  res.json(data);
});

// Handle other requests
app.use((req, res) => {
  res.status(404).send("404 Hello, world! YYY's simple IoT platform.");
});

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});