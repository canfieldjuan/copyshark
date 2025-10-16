const config = require('./index');

const databaseConfig = {
    url: config.database.url,
    isSQLite: config.database.isSQLite,
    
    sqlite: {
        path: config.database.url.replace('sqlite:', '')
    },
    
    postgres: {
        connectionString: config.database.url,
        ssl: config.env === 'production' ? {
            rejectUnauthorized: false
        } : false
    }
};

module.exports = databaseConfig;
