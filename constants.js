const path = require('path');

const ROOT_PATH = '.';
const CONFIG_PATH = path.join(ROOT_PATH, 'configs');
const SENSOR_SITES_FILE = path.join(CONFIG_PATH, 'sensor_sites.json');
const COMMON_FILE = path.join(CONFIG_PATH, 'common.json');
const DB_FILE_NAME = path.join(ROOT_PATH, 'data.sqlite');
const INIT_SQL = path.join(ROOT_PATH, 'init.sql');
const TOKEN_FILE = path.join(ROOT_PATH, 'token');
module.exports = {
    ROOT_PATH : ROOT_PATH,
    CONFIG_PATH: CONFIG_PATH,
    SENSOR_SITES_FILE : SENSOR_SITES_FILE,
    COMMON_FILE : COMMON_FILE,
    DB_FILE_NAME: DB_FILE_NAME,
    INIT_SQL: INIT_SQL,
    TOKEN_FILE: TOKEN_FILE
}
