const Alexa = require('ask-sdk-core');
const { fetchSolarData, updateWidgetDataStore } = require('./util');
const launchDocument = require('./apl/launch-document.json');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    let speechText;
    let solarData;

    try {
      solarData = await fetchSolarData();
      const power = parseFloat(solarData.realTimePower);
      const energy = parseFloat(solarData.dailyEnergy);

      if (power > 0) {
        speechText = `Benvenuto in Fotovoltaico. In questo momento il tuo impianto sta producendo ${power} kilowatt, e oggi ha prodotto ${energy} kilowattora. Cosa vuoi sapere?`;
      } else {
        speechText = `Benvenuto in Fotovoltaico. L'impianto non sta producendo energia in questo momento. Oggi ha prodotto ${energy} kilowattora in totale. Cosa vuoi sapere?`;
      }
    } catch (err) {
      console.error('LaunchRequest fetchSolarData error:', err);
      speechText = 'Benvenuto in Fotovoltaico. Puoi chiedermi la potenza attuale o la produzione di oggi.';
      solarData = { realTimePower: '--', dailyEnergy: '--', monthEnergy: '--', lastUpdated: '--' };
    }

    const responseBuilder = handlerInput.responseBuilder
      .speak(speechText)
      .reprompt('Puoi chiedermi la potenza attuale o la produzione di oggi.');

    if (supportsAPL(handlerInput)) {
      responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: 'launchToken',
        document: launchDocument,
        datasources: {
          solarData: {
            realTimePower: solarData.realTimePower,
            dailyEnergy: solarData.dailyEnergy,
            monthEnergy: solarData.monthEnergy,
            lastUpdated: solarData.lastUpdated,
          },
        },
      });
    }

    if (solarData.realTimePower !== '--') {
      tryUpdateDataStore(handlerInput, solarData);
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
      const power = parseFloat(solarData.realTimePower);

      let speechText;
      if (power > 0) {
        speechText = `In questo momento il tuo impianto sta producendo ${power} kilowatt.`;
      } else {
        speechText = "In questo momento l'impianto non sta producendo energia.";
      }

      const responseBuilder = handlerInput.responseBuilder
        .speak(speechText)
        .reprompt('Vuoi sapere altro?');

      if (supportsAPL(handlerInput)) {
        responseBuilder.addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          token: 'launchToken',
          document: launchDocument,
          datasources: {
            solarData: {
              realTimePower: solarData.realTimePower,
              dailyEnergy: solarData.dailyEnergy,
              monthEnergy: solarData.monthEnergy,
              lastUpdated: solarData.lastUpdated,
            },
          },
        });
      }

      tryUpdateDataStore(handlerInput, solarData);

      return responseBuilder.getResponse();
    } catch (err) {
      console.error('PotenzaAttualeIntent error:', err);
      return handlerInput.responseBuilder
        .speak("Mi dispiace, non riesco a ottenere i dati dall'impianto in questo momento.")
        .reprompt('Vuoi riprovare?')
        .getResponse();
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
      const energy = parseFloat(solarData.dailyEnergy);

      const speechText = `Oggi il tuo impianto ha prodotto ${energy} kilowattora.`;

      const responseBuilder = handlerInput.responseBuilder
        .speak(speechText)
        .reprompt('Vuoi sapere altro?');

      if (supportsAPL(handlerInput)) {
        responseBuilder.addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          token: 'launchToken',
          document: launchDocument,
          datasources: {
            solarData: {
              realTimePower: solarData.realTimePower,
              dailyEnergy: solarData.dailyEnergy,
              monthEnergy: solarData.monthEnergy,
              lastUpdated: solarData.lastUpdated,
            },
          },
        });
      }

      tryUpdateDataStore(handlerInput, solarData);

      return responseBuilder.getResponse();
    } catch (err) {
      console.error('ProduzioneOggiIntent error:', err);
      return handlerInput.responseBuilder
        .speak("Mi dispiace, non riesco a ottenere i dati dall'impianto in questo momento.")
        .reprompt('Vuoi riprovare?')
        .getResponse();
    }
  },
};

const UsagesInstalledHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === 'Alexa.DataStore.PackageManager.UsagesInstalled' ||
      (request.type === 'IntentRequest' && request.intent?.name === 'Alexa.DataStore.PackageManager.UsagesInstalled')
    );
  },
  async handle(handlerInput) {
    console.log('=== UsagesInstalled handler triggered ===');
    console.log('Request type:', handlerInput.requestEnvelope.request.type);
    console.log('Full request:', JSON.stringify(handlerInput.requestEnvelope.request));

    try {
      const solarData = await fetchSolarData();
      console.log('Solar data fetched:', JSON.stringify(solarData));

      const userId = handlerInput.requestEnvelope.context.System.user.userId;
      console.log('UserId:', userId);

      await updateWidgetDataStore(userId, solarData);
      console.log('DataStore updated successfully after widget install');
    } catch (err) {
      console.error('UsagesInstalled error:', err.message || err);
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
    console.log('=== UpdateRequest handler triggered ===');
    console.log('Full request:', JSON.stringify(handlerInput.requestEnvelope.request));

    try {
      const solarData = await fetchSolarData();
      const userId = handlerInput.requestEnvelope.context.System.user.userId;
      console.log('Updating DataStore after package update for user:', userId);

      await updateWidgetDataStore(userId, solarData);
      console.log('DataStore updated after package update');
    } catch (err) {
      console.error('UpdateRequest error:', err.message || err);
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

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Puoi chiedermi la potenza attuale del tuo impianto fotovoltaico, oppure quanta energia ha prodotto oggi. Cosa vuoi sapere?')
      .reprompt('Prova a dire: quanto sta producendo?')
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Arrivederci!')
      .withShouldEndSession(true)
      .getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Non ho capito. Puoi chiedermi la potenza attuale o la produzione di oggi.')
      .reprompt('Prova a dire: quanto sta producendo?')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const reason = handlerInput.requestEnvelope.request.reason;
    console.log(`Session ended: ${reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Unhandled error:', error);
    return handlerInput.responseBuilder
      .speak("Mi dispiace, si è verificato un errore. Riprova più tardi.")
      .getResponse();
  },
};

function supportsAPL(handlerInput) {
  const supportedInterfaces = handlerInput.requestEnvelope.context.System.device?.supportedInterfaces;
  return supportedInterfaces && supportedInterfaces['Alexa.Presentation.APL'];
}

function tryUpdateDataStore(handlerInput, solarData) {
  try {
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    console.log('tryUpdateDataStore - userId:', userId ? userId.substring(0, 30) + '...' : 'null');
    console.log('tryUpdateDataStore - solarData:', JSON.stringify(solarData));
    if (userId) {
      updateWidgetDataStore(userId, solarData)
        .then(() => console.log('Background DataStore update succeeded'))
        .catch((err) => console.error('Background DataStore update failed:', err.message));
    }
  } catch (err) {
    console.error('tryUpdateDataStore error:', err.message);
  }
}

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
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

exports.handler = async (event, context) => {
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log('=== Scheduled DataStore update ===');
    try {
      const userId = process.env.ALEXA_USER_ID;
      if (!userId) {
        console.error('ALEXA_USER_ID not set, skipping scheduled update');
        return { statusCode: 400, body: 'Missing ALEXA_USER_ID' };
      }
      const solarData = await fetchSolarData();
      console.log('Scheduled fetch:', JSON.stringify(solarData));
      await updateWidgetDataStore(userId, solarData);
      console.log('Scheduled DataStore update succeeded');
      return { statusCode: 200, body: 'OK' };
    } catch (err) {
      console.error('Scheduled update error:', err.message);
      return { statusCode: 500, body: err.message };
    }
  }

  return new Promise((resolve, reject) => {
    alexaHandler(event, context, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};
