async function getRadarResponse(params, fetchData = fetch, logger = console) {
  const values = [params.lat, params.lon, params.radius].map(Number);
  if (!values.every(Number.isFinite) || Math.abs(values[0]) > 90 || Math.abs(values[1]) > 180 || values[2] <= 0 || values[2] > 250) {
    return { status: 400, body: { error: 'Invalid radar coordinates or radius.' } };
  }

  try {
    const response = await fetchData(`https://api.adsb.lol/v2/point/${values.join('/')}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { status: response.status, body: { error: 'Aircraft data provider is unavailable.' } };
    return { status: 200, body: await response.json() };
  } catch (error) {
    logger.error('Aircraft feed request failed:', error);
    return { status: 502, body: { error: 'Could not reach the aircraft data provider.' } };
  }
}

module.exports = getRadarResponse;
