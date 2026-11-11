const getRadarResponse = require('./proxy.cjs');

module.exports = async function (context, req) {
  context.res = await getRadarResponse(req.params, fetch, context.log);
};
