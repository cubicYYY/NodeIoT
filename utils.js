// This module is designed to have NO SIDE EFFECTS!
// So no SQL sentence should be complete/executed.
const fs = require('fs');
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
    this._inited = (typeof initedCache[this.getSensorIdentifier()] !== 'undefined');

    // Cache all-column definitions(common part + unique part)
    this.sensorSchema = Object.assign({}, recordCommonSchema, this.sensorObject.schema);

    // console.info(`Init SQL: ${this.getInitSQL()}`);
  }
  getSensorIdentifier() { // returns the name of corresponding table in SQLite
    return this.siteName + '_' + this.sensorName;
  }
  getInitSQL() {
    const columnsExpression = Object.entries(this.sensorSchema).map(([name, type]) => {
      return `${name} ${type}`;
    }).join(', ');

    return `CREATE TABLE IF NOT EXISTS ${this.getSensorIdentifier()} (${columnsExpression});` +
      `CREATE INDEX IF NOT EXISTS ${this.getSensorIdentifier() + '_timeidx'} ON ${this.getSensorIdentifier()}(timestamp);`;
  }
  getPreparedInsertSQL(data) {
    // prepared statement for record insertion
    const columnNames = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    return `INSERT INTO ${this.getSensorIdentifier()} (${columnNames}) VALUES (${placeholders});`;
  }
  isInited() {
    return this._inited;
  }
  setInited() {
    initedCache[this.getSensorIdentifier()] = true;
  }
}

// Utils Async
function serial(asyncFunctions) {
  return asyncFunctions.reduce(function (functionChain, nextFunction) {
    return functionChain.then(
      (previousResult) => nextFunction(previousResult)
    );
  }, Promise.resolve());
}

module.exports = {
  SensorContext: SensorContext,
  // tryInitTable: tryInitTable,
  // executeQueries: executeQueries
};