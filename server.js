(async () => {
  const express = require('express');
  const rateLimit = require('express-rate-limit');
  const fs = require('fs');
  const sqlite3 = require('sqlite3').verbose();

  const utils = require('./utils.js');
  const constants = require('./constants.js');

  const serverToken = fs.readFileSync(constants.TOKEN_FILE, 'utf8');
  // Sync run, or block until all SQL before it is executed
  async function syncRunQuery(sql, params) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(sql);

      db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }

        stmt.finalize();
        console.log("donesync");

      });
    });
  }

  // Create a new database connection, and try to init it.
  const db = new sqlite3.Database(constants.DB_FILE_NAME);
  const dbInitSQL = fs.readFileSync(constants.INIT_SQL, 'utf8');
  await syncRunQuery(dbInitSQL);
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
  app.post(UPLOAD_PATH, express.json(), (req, res) => {
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
    try {
      const site = req.params.site;
      const sensor = req.params.sensor;
      let ctx = new utils.SensorContext(site, sensor);

      // Asynchronously update!
      db.serialize(() => {
        db.run(ctx.getInitSQL(), []); // try to init the table if it doesn't exist
        // TODO: init all tables before inserting!
        db.run(ctx.getPreparedInsertSQL(req.body), Object.values(req.body)); // insert
        console.log("inserted!");
        const response = {
          "ok": true,
          "msg": ""
        };
        res.json(response);
      });
    } catch (err) {
      const response = {
        "ok": false,
        "msg": err.message
      };
      res.json(response);
    }
  });

  // Handle other requests
  app.use((req, res) => {
    res.status(404).send("404 Hello, world! YYY's simple IoT platform.");
  });

  // Start the server
  app.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
  process.on('uncaughtException', () => { console.log('Server uncaught exception'); });
})();