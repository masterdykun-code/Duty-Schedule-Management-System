export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

export function sendError(res, message, status = 400, details = null) {
  const errorObj = { message };
  if (details) {
    Object.assign(errorObj, details);
  }
  return res.status(status).json({
    success: false,
    error: errorObj,
  });
}
