module.exports = {
  WELCOME_PRODUCING: (power, energy) =>
    `Benvenuto in Fotovoltaico. In questo momento il tuo impianto sta producendo ${power} kilowatt, e oggi ha prodotto ${energy} kilowattora. Cosa vuoi sapere?`,
  WELCOME_NOT_PRODUCING: (energy) =>
    `Benvenuto in Fotovoltaico. L'impianto non sta producendo energia in questo momento. Oggi ha prodotto ${energy} kilowattora in totale. Cosa vuoi sapere?`,
  WELCOME_FALLBACK: 'Benvenuto in Fotovoltaico. Puoi chiedermi la potenza attuale o la produzione di oggi.',
  REPROMPT_DEFAULT: 'Puoi chiedermi la potenza attuale o la produzione di oggi.',

  POWER_PRODUCING: (power) =>
    `In questo momento il tuo impianto sta producendo ${power} kilowatt.`,
  POWER_NOT_PRODUCING: "In questo momento l'impianto non sta producendo energia.",
  REPROMPT_MORE: 'Vuoi sapere altro?',

  DAILY_ENERGY: (energy) =>
    `Oggi il tuo impianto ha prodotto ${energy} kilowattora.`,

  HELP: 'Puoi chiedermi la potenza attuale del tuo impianto fotovoltaico, oppure quanta energia ha prodotto oggi. Cosa vuoi sapere?',
  HELP_REPROMPT: 'Prova a dire: quanto sta producendo?',

  GOODBYE: 'Arrivederci!',

  FALLBACK: 'Non ho capito. Puoi chiedermi la potenza attuale o la produzione di oggi.',
  FALLBACK_REPROMPT: 'Prova a dire: quanto sta producendo?',

  ERROR_FETCH: "Mi dispiace, non riesco a ottenere i dati dall'impianto in questo momento.",
  ERROR_RETRY_REPROMPT: 'Vuoi riprovare?',
  ERROR_GENERIC: "Mi dispiace, si è verificato un errore. Riprova più tardi.",
};
