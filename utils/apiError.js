class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode || 500;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;