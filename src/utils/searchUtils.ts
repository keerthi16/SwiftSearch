import * as fs from 'fs';
import { checkDiskSpace } from './checkDiskSpace';
import { searchConfig } from '../searchConfig';
import { UserConfig } from '../interface/interface';

/**
 * Utils to validate users config data and
 * available disk space to enable electron search
 */
/*eslint class-methods-use-this: ["error", { "exceptMethods": ["checkFreeSpace"] }] */
export default class SearchUtils {
    private indexVersion: string;

    constructor() {
        this.indexVersion = searchConfig.INDEX_VERSION;
    }

    /**
     * This function returns true if the available disk space
     * is more than the constant MINIMUM_DISK_SPACE
     * @returns {Promise}
     */
    public checkFreeSpace(): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * This function return the user search config
     * @param userId
     * @returns {Promise<object>}
     */
    public getSearchUserConfig(userId): Promise<UserConfig> {
        return new Promise((resolve, reject) => {
            readFile.call(this, userId, resolve, reject);
        });
    }

    /**
     * This function updates the user config file
     * with the provided data
     * @param userId
     * @param data
     * @returns {Promise<object>}
     */
    public updateUserConfig(userId, data): Promise<UserConfig> {
        return new Promise((resolve, reject) => {
            updateConfig.call(this, userId, data, resolve, reject);
        });
    }
}

/**
 * This function reads the search user config file and
 * return the object
 * @param userId
 * @param resolve
 * @param reject
 */
function readFile(userId, resolve, reject) {
    if (fs.existsSync(`${searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE}`)) {
        fs.readFile(`${searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE}`, 'utf8', (err, data) => {
            if (err) {
                return reject(new Error('Error reading the '));
            }
            let usersConfig: UserConfig;
            try {
                usersConfig = JSON.parse(data);
            } catch (e) {
                createUserConfigFile(userId, undefined);
                return reject('can not parse user config file data: ' + data + ', error: ' + e);
            }
            if (!usersConfig[userId]) {
                createUser(userId, usersConfig);
                return reject(null);
            }
            return resolve(usersConfig[userId]);
        });
    } else {
        createUserConfigFile(userId, undefined);
        resolve(null);
    }
}

/**
 * If the config has no object for the provided userId this function
 * creates an empty object with the key as the userId
 * @param userId
 * @param oldConfig
 */
function createUser(userId: string, oldConfig: UserConfig): void {
    const configPath = searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE;
    const newConfig = Object.assign({}, oldConfig);
    newConfig[userId] = {};

    const jsonNewConfig = JSON.stringify(newConfig, null, ' ');

    fs.writeFile(configPath, jsonNewConfig, 'utf8', (err) => {
        if (err) {
            console.log('error');
        }
    });
}

/**
 * This function creates the config
 * file if not present
 * @param userId
 * @param data
 */
function createUserConfigFile(userId, data): void {
    let userData = data;

    const createStream = fs.createWriteStream(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE);
    if (userData) {
        if (!userData.indexVersion) {
            userData.indexVersion = this.indexVersion;
        }
        try {
            userData = JSON.stringify(userData);
            createStream.write(`{"${userId}": ${userData}}`);
        } catch (e) {
            createStream.write(`{"${userId}": {}}`);
        }
    } else {
        createStream.write(`{"${userId}": {}}`);
    }
    createStream.end();
}

/**
 * Function to update user config data
 * @param userId
 * @param data
 * @param resolve
 * @param reject
 * @returns {*}
 */
function updateConfig(userId, data, resolve, reject) {
    const userData: UserConfig = data;

    if (userData && !userData.indexVersion) {
        userData.indexVersion = this.indexVersion;
    }

    const configPath = searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE;
    if (!fs.existsSync(configPath)) {
        createUserConfigFile(userId, userData);
        return reject(null);
    }

    let oldConfig;
    const oldData = fs.readFileSync(configPath, 'utf8');

    try {
        oldConfig = JSON.parse(oldData);
    } catch (e) {
        createUserConfigFile(userId, data);
        return reject(new Error('can not parse user config file data: ' + e));
    }

    const newConfig = Object.assign({}, oldConfig);
    newConfig[userId] = data;

    const jsonNewConfig = JSON.stringify(newConfig, null, ' ');

    fs.writeFileSync(configPath, jsonNewConfig, 'utf8');
    return resolve(newConfig[userId]);
}
