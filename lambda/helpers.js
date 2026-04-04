const launchDocument = require('./apl/launch-document.json');

function supportsAPL(handlerInput) {
  const interfaces = handlerInput.requestEnvelope.context.System.device?.supportedInterfaces;
  return interfaces && interfaces['Alexa.Presentation.APL'];
}

function addAplDirective(responseBuilder, handlerInput, solarData) {
  if (!supportsAPL(handlerInput)) return;

  const datasources = {
    solarData: {
      realTimePower: solarData.realTimePower,
      dailyEnergy: solarData.dailyEnergy,
      monthEnergy: solarData.monthEnergy,
      lastUpdated: solarData.lastUpdated,
    },
    chartData: solarData.chartData || {},
  };

  responseBuilder.addDirective({
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'launchToken',
    document: launchDocument,
    datasources,
  });
}

function safeNumber(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

module.exports = { supportsAPL, addAplDirective, safeNumber };
