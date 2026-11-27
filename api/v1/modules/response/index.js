const sendResponse = (res, statusCode, message, data = null, error = null, errorCode = null) => {
    if (statusCode === 204) {
        return res.status(204).end();
    }

    const response = {
        success: statusCode >= 200 && statusCode < 300,
        message,
        timestamp: new Date().toISOString()
    };

    if (data) response.data = data;
    if (error) response.error = error;
    if (errorCode) response.errorCode = errorCode;

    return res.status(statusCode).json(response);
};

const ResponseManager = {
    success: (res, message, data = null) => {
        return sendResponse(res, 200, message, data);
    },

    created: (res, message, data = null) => {
        return sendResponse(res, 201, message, data);
    },

    noContent: (res) => {
        return sendResponse(res, 204)
    },

    badRequest: (res, message, error = null, errorCode = null) => {
        return sendResponse(res, 400, message, null, error, errorCode);
    },

    unauthorized: (res, message = 'Unauthorized') => {
        return sendResponse(res, 401, message);
    },

    forbidden: (res, message = 'Forbidden') => {
        return sendResponse(res, 403, message);
    },

    notFound: (res, message = 'Resource not found') => {
        return sendResponse(res, 404, message);
    },

    duplicate: (res, message = 'Duplicate record') => {
        return sendResponse(res, 409, message);
    },

    validationError: (res, message, errors) => {
        return sendResponse(res, 422, message, null, { errors });
    },

    serverError: (res, message = 'Internal server error') => {
        return sendResponse(res, 500, message);
    },

    serviceUnavailable: (res, message = 'Service temporarily unavailable') => {
        return sendResponse(res, 503, message);
    }
};

module.exports = ResponseManager;