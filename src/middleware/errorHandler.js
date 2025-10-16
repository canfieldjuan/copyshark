const config = require('../config');
const { ApiError } = require('../../utils/errors');

const errorHandler = (err, req, res, next) => {
    if (req.log?.error) {
        req.log.error({ err }, 'Unhandled error');
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
    }

    return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: config.env === 'development' ? err.message : 'Something went wrong'
    });
};

module.exports = { errorHandler };
