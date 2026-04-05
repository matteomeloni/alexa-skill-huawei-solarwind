const Alexa = require('ask-sdk-core');
const { fetchSolarData, updateWidgetDataStore } = require('../util');
const { addAplDirective, safeNumber } = require('../helpers');
const msg = require('../messages');

async function tryUpdateDataStore(handlerInput, solarData) {
  try {
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    if (!userId) return;
    await Promise.race([
      updateWidgetDataStore(userId, solarData),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DataStore timeout')), 3000)),
    ]);
  } catch (err) {
    console.error('DataStore update failed:', err.message);
  }
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    let speechText;
    let solarData;

    try {
      solarData = await fetchSolarData();
      const power = safeNumber(solarData.realTimePower);
      const energy = safeNumber(solarData.dailyEnergy);

      speechText = power > 0 ? msg.WELCOME_PRODUCING(power, energy) : msg.WELCOME_NOT_PRODUCING(energy);
    } catch (err) {
      console.error('LaunchRequest error:', err.message);
      speechText = msg.WELCOME_FALLBACK;
      solarData = { realTimePower: '--', dailyEnergy: '--', monthEnergy: '--', lastUpdated: '--', chartData: null };
    }

    const responseBuilder = handlerInput.responseBuilder.speak(speechText).reprompt(msg.REPROMPT_DEFAULT);

    addAplDirective(responseBuilder, handlerInput, solarData);

    if (solarData.realTimePower !== '--') {
      await tryUpdateDataStore(handlerInput, solarData);
    }

    return responseBuilder.getResponse();
  },
};

const PotenzaAttualeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'PotenzaAttualeIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const solarData = await fetchSolarData();
      const power = safeNumber(solarData.realTimePower);

      const speechText = power > 0 ? msg.POWER_PRODUCING(power) : msg.POWER_NOT_PRODUCING;

      const responseBuilder = handlerInput.responseBuilder.speak(speechText).reprompt(msg.REPROMPT_MORE);

      addAplDirective(responseBuilder, handlerInput, solarData);
      await tryUpdateDataStore(handlerInput, solarData);

      return responseBuilder.getResponse();
    } catch (err) {
      console.error('PotenzaAttualeIntent error:', err.message);
      return handlerInput.responseBuilder.speak(msg.ERROR_FETCH).reprompt(msg.ERROR_RETRY_REPROMPT).getResponse();
    }
  },
};

const ProduzioneOggiIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ProduzioneOggiIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const solarData = await fetchSolarData();
      const energy = safeNumber(solarData.dailyEnergy);

      const responseBuilder = handlerInput.responseBuilder.speak(msg.DAILY_ENERGY(energy)).reprompt(msg.REPROMPT_MORE);

      addAplDirective(responseBuilder, handlerInput, solarData);
      await tryUpdateDataStore(handlerInput, solarData);

      return responseBuilder.getResponse();
    } catch (err) {
      console.error('ProduzioneOggiIntent error:', err.message);
      return handlerInput.responseBuilder.speak(msg.ERROR_FETCH).reprompt(msg.ERROR_RETRY_REPROMPT).getResponse();
    }
  },
};

module.exports = {
  LaunchRequestHandler,
  PotenzaAttualeIntentHandler,
  ProduzioneOggiIntentHandler,
};
