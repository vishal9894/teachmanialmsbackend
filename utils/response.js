const sendResponse = (
  res,
  {
    statusCode = 200,
    success = true,
    message = "Success",
    data = null,
    ...rest 
  } = {}
) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    ...rest, 
  });
};

module.exports = sendResponse;