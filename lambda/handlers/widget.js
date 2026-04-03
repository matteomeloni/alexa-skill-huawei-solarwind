const { fetchSolarData, updateWidgetDataStore } = require('../util');

const UsagesInstalledHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === 'Alexa.DataStore.PackageManager.UsagesInstalled' ||
      (request.type === 'IntentRequest' && request.intent?.name === 'Alexa.DataStore.PackageManager.UsagesInstalled')
    );
  },
  async handle(handlerInput) {
    console.log('UsagesInstalled handler triggered');

    try {
      const solarData = await fetchSolarData();
      const userId = handlerInput.requestEnvelope.context.System.user.userId;

      await updateWidgetDataStore(userId, solarData);
      console.log('DataStore updated after widget install');
    } catch (err) {
      console.error('UsagesInstalled error:', err.message);
    }

    return handlerInput.responseBuilder.getResponse();
  },
};

const UpdateRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'Alexa.DataStore.PackageManager.UpdateRequest';
  },
  async handle(handlerInput) {
    console.log('UpdateRequest handler triggered');

    try {
      const solarData = await fetchSolarData();
      const userId = handlerInput.requestEnvelope.context.System.user.userId;

      await updateWidgetDataStore(userId, solarData);
      console.log('DataStore updated after package update');
    } catch (err) {
      console.error('UpdateRequest error:', err.message);
    }

    return handlerInput.responseBuilder.getResponse();
  },
};

const UsagesRemovedHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === 'Alexa.DataStore.PackageManager.UsagesRemoved' ||
      (request.type === 'IntentRequest' && request.intent?.name === 'Alexa.DataStore.PackageManager.UsagesRemoved')
    );
  },
  handle(handlerInput) {
    console.log('Widget removed');
    return handlerInput.responseBuilder.getResponse();
  },
};

module.exports = {
  UsagesInstalledHandler,
  UpdateRequestHandler,
  UsagesRemovedHandler,
};
