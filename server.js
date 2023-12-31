(async () => {
  const { exit } = require('process');
  const express = require('express');
  const rateLimit = require('express-rate-limit');
  const fs = require('fs');
  const sqlite3 = require('sqlite3').verbose();

  const utils = require('./utils.js');
  const constants = require('./constants.js');

  const serverToken = fs.readFileSync(constants.TOKEN_FILE, 'utf8');

  // Limiters
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


  // Create Express application and DB 
  const app = express();
  const db = new sqlite3.Database(constants.DB_FILE);

  const apiRouter = express.Router();

  // Create a new database connection, and try to init it.
  const dbInitSQL = fs.readFileSync(constants.INIT_SQL, 'utf8');
  async function serverInit() {
    await db.runAsync(dbInitSQL);
    console.info("Initialization Finished. Starting server...");

    // Sites table initialization
    for (const name in utils.registeredSites) {
      const desc = name.desc;

      // Check if a row with the same name already exists in the database
      db.get('SELECT * FROM Sites WHERE name = ?', [name], (err, row) => {
        if (err) {
          console.error(err);
        } else {
          if (!row) {
            // Insert the name and desc columns into the database
            db.run('INSERT INTO Sites (name, desc) VALUES (?, ?)', [name, desc], (err) => {
              if (err) {
                console.error(err);
              } else {
                console.log(`Inserted ${name} into the database.`);
              }
            });
          } else {
            // console.log(`Row with name ${name} already exists in the database.`);
          }
        }
      });
    };
  }
  await serverInit();

  //------MIDDLEWARES------
  // Auth middleware
  function needAuth(req, res, next) {
    console.debug(req.params); // !debug only
    console.debug(req.query); // !debug only
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
    next();
  }

  // Log middleware
  function logger(req, res, next) {
    // console.log(req);
    next();
  }

  //------MAIN LOGICS------
  // Upload Sensor Data
  const UPLOAD_PATH = '/upload/:site/:sensor$'

  apiRouter.post(UPLOAD_PATH, minuteLimit, burstLimit, needAuth, express.json(), async (req, res) => {
    // pre-defined variables for DB operations
    const site = req.params.site;
    const sensor = req.params.sensor;
    let ctx;
    try { ctx = new utils.SensorContext(site, sensor); } catch (err) {
      console.error(err);
      res.status(500).json({
        "ok": false,
        "msg": err.message
      });
      return;
    }

    // Update the database
    queries = [];
    function addQuery(sql, params) {
      queries.push({ sql: sql, params: params });
    }

    // Determine what queries should be run 
    // (because some are not needed depending on if the database is initialized).
    if (!ctx.isInited()) {
      console.info(`Initializing sensor table...`);
      addQuery(ctx.initSQL(), []); // Try to init the table if it doesn't exist
    }


    // Run the data record insertion to SQLite, each connection SYNChronously (avoid races)
    // i.e. We don't want operations from another connection failed because of a transaction being running.
    try {
      await db.executeTransaction(queries);
      await ctx.setInited();
      queries = [];
      console.log(req.body);
      addQuery(ctx.preparedInsertSQL(req.body), Object.values(req.body));
      await db.executeTransaction(queries);
      await (res.status(200).json({
        "ok": true,
        "msg": ""
      }));
    } catch (err) {
      console.error(err);
      res.status(500).json({
        "ok": false,
        "msg": err.message
      });
    };
  });

  // Query Sensor Data
  // ! fetch all data by default, which CAN BE EXTREMELY SLOW
  const QUERY_PATH = '/query/:site/:sensor$'
  apiRouter.get(QUERY_PATH, minuteLimit, burstLimit, needAuth, express.json(), async (req, res) => {
    // pre-defined variables for DB operations
    const site = req.params.site;
    const sensor = req.params.sensor;
    let ctx;
    try { ctx = new utils.SensorContext(site, sensor); } catch (err) {
      console.error(err);
      res.status(500).json({
        "ok": false,
        "msg": err.message
      });
      return;
    }

    // Fetch the database, ONLY the newest 25000 rows
    db.all(ctx.recentRecords(25000), async (err, rows) => {
      if (err) {
        res.status(500).json({
          "ok": false,
          "msg": err.message
        });
      } else {
        res.status(200).json({
          "ok": true,
          "msg": rows
        });
      }

    });

  });

  // Load paths into the server

  app.use("/api", logger, apiRouter);

  // Handle other requests (fallback)
  app.use((req, res) => {
    res.status(404).send("404 Hello, world! YYY's simple IoT platform.");
  });

  // Start the server
  app.listen(3000, () => {
    console.info('Server listening on port 3000');
  });
  process.on('uncaughtException', (err) => {
    console.error(`Server uncaught exception: `);
    console.error(err);
    exit();
  });
  process.on('exit', () => { db.close(); console.info("Server closed."); })
})();