const axios = require('axios');

const KIOSK_URL = 'https://uni005eu5.fusionsolar.huawei.com/rest/pvms/web/kiosk/v1/station-kiosk-file';

async function fetchKioskResponse() {
  const token = process.env.KIOSK_TOKEN;
  if (!token) {
    throw new Error('KIOSK_TOKEN environment variable not set');
  }

  const response = await axios.get(KIOSK_URL, {
    params: { kk: token },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AlexaSkill-Fotovoltaico/1.0',
    },
    timeout: 8000,
    maxRedirects: 0,
  });

  return response.data;
}

module.exports = { fetchKioskResponse };
