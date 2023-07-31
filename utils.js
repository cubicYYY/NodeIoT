// This module is designed to have NO SIDE EFFECTS!
// So no SQL sentence should be complete/executed.
const fs = require('fs');
const constants = require('./constants.js');

const registeredSitesStr = fs.readFileSync(constants.SENSOR_SITES_FILE, 'utf8');
const registeredSites = JSON.parse(registeredSitesStr);
console.log(registeredSites);

const commonStr = fs.readFileSync(constants.COMMON_FILE, 'utf8');
const common = JSON.parse(commonStr);
console.log(common);

// Errors
class NotRegisteredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotRegisteredError';
  }
}


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

    // Cache all-column definitions(common part + unique part)
    this.sensorSchema = Object.assign({}, common.recordCommonSchema, this.sensorObject.schema);

    console.log(`Upload received from ${siteName}.${sensorName}.`);
    console.info(`Init SQL: ${this.getInitSQL()}`);
    console.info(`Insert SQL: ${this.getPreparedInsertSQL()}`);
  }
  getTableName() { // returns the name of corresponding table in SQLite
    return this.siteName + '_' + this.sensorName;
  }
  getInitSQL() {
    const columnsExpression = Object.entries(this.sensorSchema).map(([name, type]) => {
      return `${name} ${type}`;
    }).join(', ');
    console.log(columnsExpression);

    return `CREATE TABLE IF NOT EXISTS ${this.getTableName()} (${columnsExpression});`;
  }
  getPreparedInsertSQL() {
    const columnNames = Object.keys(this.sensorSchema).join(', ');
    const placeholders = Object.keys(this.sensorSchema).map(() => '?').join(', ');
    return `INSERT INTO ${this.getTableName()} (${columnNames}) VALUES (${placeholders})`;
  }
}

module.exports = { SensorContext: SensorContext };