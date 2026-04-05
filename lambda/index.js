const Alexa = require('ask-sdk-core');
const { fetchSolarData, updateWidgetDataStore } = require('./util');

const { LaunchRequestHandler, PotenzaAttualeIntentHandler, ProduzioneOggiIntentHandler } = require('./handlers/solar');
const { UsagesInstalledHandler, UpdateRequestHandler, UsagesRemovedHandler } = require('./handlers/widget');
const {
  HelpIntentHandler,
  CancelAndStopIntentHandler,
  FallbackIntentHandler,
  SessionEndedRequestHandler,
  ErrorHandler,
} = require('./handlers/builtin');

const alexaHandler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PotenzaAttualeIntentHandler,
    ProduzioneOggiIntentHandler,
    UsagesInstalledHandler,
    UpdateRequestHandler,
    UsagesRemovedHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

exports.handler = async (event, context) => {
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log('Scheduled DataStore update');
    try {
      const userId = process.env.ALEXA_USER_ID;
      if (!userId) {
        console.error('ALEXA_USER_ID not set');
        return { statusCode: 400, body: 'Missing ALEXA_USER_ID' };
      }
      const solarData = await fetchSolarData();
      await updateWidgetDataStore(userId, solarData);
      console.log('Scheduled update succeeded');
      return { statusCode: 200, body: 'OK' };
    } catch (err) {
      console.error('Scheduled update error:', err.message);
      return { statusCode: 500, body: 'Internal error' };
    }
  }

  return new Promise((resolve, reject) => {
    alexaHandler(event, context, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};
