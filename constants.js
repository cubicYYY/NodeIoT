const path = require('path');

const ROOT_PATH = '.';
const CONFIG_PATH = path.join(ROOT_PATH, 'configs');
const STATES_PATH = path.join(ROOT_PATH, 'states');
const DB_FILE = path.join(ROOT_PATH, 'data.sqlite');
const INIT_SQL = path.join(ROOT_PATH, 'init.sql');
const TOKEN_FILE = path.join(ROOT_PATH, 'token');

const SENSOR_SITES_FILE = path.join(CONFIG_PATH, 'sensor_sites.json');
const COMMON_FILE = path.join(CONFIG_PATH, 'common.json');
module.exports = {
    ROOT_PATH : ROOT_PATH,
    CONFIG_PATH: CONFIG_PATH,
    SENSOR_SITES_FILE : SENSOR_SITES_FILE,
    COMMON_FILE : COMMON_FILE,
    DB_FILE: DB_FILE,
    INIT_SQL: INIT_SQL,
    TOKEN_FILE: TOKEN_FILE
}
