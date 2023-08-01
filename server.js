const { rejects } = require('assert');
const { resolve } = require('path');
const { exit } = require('process');

(async () => {
  const express = require('express');
  const rateLimit = require('express-rate-limit');
  const fs = require('fs');
  const sqlite3 = require('sqlite3').verbose();

  const utils = require('./utils.js');
  const constants = require('./constants.js');

  const serverToken = fs.readFileSync(constants.TOKEN_FILE, 'utf8');

  // Create a new database connection, and try to init it.
  const db = new sqlite3.Database(constants.DB_FILE_NAME);
  const dbInitSQL = fs.readFileSync(constants.INIT_SQL, 'utf8');

  // Toolkits
  function promisedQuery(query, params) {
    return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Create Express application
  const app = express();
  async function serverInit() {
    await promisedQuery(dbInitSQL);
    console.log("Initialization Finished. Starting server...");
  }
  await serverInit();

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
  app.post(UPLOAD_PATH, express.json(), async (req, res) => {
    console.log(req.params);
    // Verify token
    let token = null;
    if (typeof req.headers['x-upload-token'] === 'string') {
      token = req.headers['x-upload-token'];
    } else {
      token = req.query.token;
    }

    if (token !== serverToken) {
      res.status(401).send('Invalid token or token is not provided.');
      return;
    }

    // pre-defined variables for DB operations
    const site = req.params.site;
    const sensor = req.params.sensor;
    let ctx = new utils.SensorContext(site, sensor);

    // TODO modify prototype of Database
    function executeTransaction(queries) {
      // Run a batch of SQL queries as a transaction, rollback if failed
      // e.g. queries = [{sql:"select ?;", params:[1]}]
      let batch = [{ sql: "BEGIN", params: [] }, ...queries, { sql: "COMMIT", params: [] }]
      let results = [];
      return batch.reduce((chain, query) => chain.then(result => {
        results.push(result); // save the last result
        return promisedQuery(query.sql, query.params);
      }), Promise.resolve())
        .catch(err => promisedQuery("ROLLBACK", []).then(() => Promise.reject(err)))
        .then(() => results.slice(2)); // eliminate the first two useless results (Promise.resolve() and BEGIN)
    }

    // Update the database
    queries = [];
    function addQuery(sql, params) {
      queries.push({ sql: sql, params: params });
    }
    if (!ctx.isInited()) {
      console.log(`Initializing sensor table...`);
      addQuery(ctx.getInitSQL(), []); // try to init the table if it doesn't exist
    }
    addQuery(ctx.getPreparedInsertSQL(req.body), Object.values(req.body));
    executeTransaction(queries) // Run each connection asynchronously
      .then(() => ctx.setInited())
      .then(() => res.status(200).json({
        "ok": true,
        "msg": ""
      }))
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          "ok": false,
          "msg": err.message
        });
      });

  });

  // Handle other requests
  app.use((req, res) => {
    res.status(404).send("404 Hello, world! YYY's simple IoT platform.");
  });

  // Start the server
  app.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
  process.on('uncaughtException', (err) => {
    console.log(`Server uncaught exception: `);
    console.log(err);
    exit();
  });
  process.on('exit', () => { db.close(); console.log("Server closed."); })
})();