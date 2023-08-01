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


  function promisedQuery(query, params) {
    return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  async function serverInit() {
    await promisedQuery(dbInitSQL);
    console.log("Initialization Finished. Starting server...");
  }
  await serverInit();
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

    function executeQueries(queries) { // UNFINISHED
      // TODO: use this instead of .then chaining
      // [{sql:"select ?;", params:[1]}]
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          for (let i = 0; i < queries.length; i++) {
            db.run(queries[i].sql, queries[i].params, function (err) {
              if (err) {
                reject(err);
              }
            });
          }
          resolve();
        });
      });
    }

    async function tryInitTable() {
      if (!ctx.isInited()) {
        console.log(`Initializing sensor table...`);
        await promisedQuery(ctx.getInitSQL()); // try to init the table if it doesn't exist
        ctx.setInited();
        console.log("Table initialized.");
      }
    };

    // Update the database
    db.serialize(async () => { // UGLY!UGLY!
      await promisedQuery("BEGIN")
        .then(() => {
          return new Promise(async (resolve, reject) => {
            await tryInitTable();
            resolve();
          });
        })
        .then(() => { return promisedQuery(ctx.getPreparedInsertSQL(req.body), Object.values(req.body)) })
        .then(() => { return promisedQuery("COMMIT") })
        .then(
          () => {
            res.json({
              "ok": true,
              "msg": ""
            })
          })
        .catch((err) => {
          console.log("SQL promise failed: ")
          console.log(err);
          res.json({
            "ok": false,
            "msg": err.message
          })
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
  process.on('exit', () => { db.close(); })
})();