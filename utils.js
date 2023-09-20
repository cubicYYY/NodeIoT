const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const constants = require('./constants.js');

const registeredSitesStr = fs.readFileSync(constants.SENSOR_SITES_FILE, 'utf8');
const registeredSites = JSON.parse(registeredSitesStr);
console.log(registeredSites);

let initedCache = {};
// const commonStr = fs.readFileSync(constants.COMMON_FILE, 'utf8');
// const common = JSON.parse(commonStr);
// console.log(common);

// Errors
class NotRegisteredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotRegisteredError';
  }
}

const recordCommonSchema = {
  "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
  "timestamp": "BIGINT NOT NULL DEFAULT (strftime('%s', 'now'))"
};

// This class is designed to have NO SIDE EFFECTS!
// So no SQL sentence should be complete/executed.
class SensorContext {
  constructor(siteName, sensorName) {
    if (typeof siteName !== 'string' || typeof sensorName !== 'string')
      throw new TypeError(
        `Site, sensor shoule both be a string ` +
        `(${typeof siteName} and ${typeof sensorName} are given).`);

    // Check if the sensor is registered
    if (typeof registeredSites[siteName] === 'undefined')
      throw new NotRegisteredError(`Site called '${siteName}' has not been registered yet.`);
    if (typeof registeredSites[siteName].sensors[sensorName] === 'undefined')
      throw new NotRegisteredError(`Sensor called '${sensorName}' has not been registered` +
        `at site '${siteName}' yet.`);

    this.sensorName = sensorName;
    this.siteName = siteName;
    this.sensorObject = registeredSites[siteName].sensors[sensorName];
    this.sensorDesc = this.sensorObject.desc;
    this._inited = (typeof initedCache[this.sensorIdentifier()] !== 'undefined');

    // Cache all-column definitions(common part + unique part)
    this.sensorSchema = Object.assign({}, recordCommonSchema, this.sensorObject.schema);

    // console.info(`Init SQL: ${this.getInitSQL()}`);
  }
  
  sensorIdentifier() { // returns the name of corresponding table in SQLite
    return this.siteName + '_' + this.sensorName;
  }

  indexName() { // returns the name of corresponding table in SQLite
    return this.sensorIdentifier() + '_timeidx';
  }

  columnsExpression() { // returns the name of corresponding data columns of this sensor in SQLite
    return Object.entries(this.sensorSchema).map(([name, type]) => {
      return `${name} ${type}`;
    }).join(', ');
  }

  allRecords() {
    return `SELECT * FROM ${this.sensorIdentifier()};`;
  }

  initSQL() {
    return `CREATE TABLE IF NOT EXISTS ${this.sensorIdentifier()} (${this.columnsExpression()});` +
      `CREATE INDEX IF NOT EXISTS ${this.indexName()} ON ${this.sensorIdentifier()}(timestamp);`;
  }

  preparedInsertSQL(data) {
    // prepared statement for record insertion
    const columnNames = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    return `INSERT INTO ${this.sensorIdentifier()} (${columnNames}) VALUES (${placeholders});`;
  }
  isInited() {
    return this._inited;
  }
  setInited() {
    initedCache[this.sensorIdentifier()] = true;
  }
}

// Utils Async
function serial(asyncFunctions) {
  return asyncFunctions.reduce(function (functionChain, thenable) {
    return functionChain.then(
      () => thenable()
    );
  }, Promise.resolve());
}

// Expanded Toolkits
sqlite3.Database.prototype.runAsync = function (query, params) {
  return new Promise((resolve, reject) => {
    this.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}


sqlite3.Database.prototype.executeTransaction = async function (queries) {
  // Run a batch of SQL queries as a transaction, rollback if failed
  // e.g. queries = [{sql:"select ?;", params:[1]}]
  let batch = [{ sql: "BEGIN", params: [] }, ...queries, { sql: "COMMIT", params: [] }]
  let results = [];
  for (const query of batch) { // do each query IN ORDER
    try {
      let queryResult = await this.runAsync(query.sql, query.params);
      results.push(queryResult);
    } catch (err) {
      await this.runAsync("ROLLBACK", []);
      throw err;
    }
  }
  // console.log(results);
  return results.slice(1, -1); // Eliminate useless results (BEGIN & COMMIT)
}

console.log("Custom SQLite functions injected.");

module.exports = {
  SensorContext: SensorContext,
  serial: serial,
};