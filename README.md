# Fotovoltaico - Alexa Skill

Alexa Skill per monitorare la produzione del tuo impianto fotovoltaico Huawei FusionSolar.

## Funzionalita'

- **Potenza in tempo reale**: "Alexa, chiedi a fotovoltaico quanto sta producendo"
- **Produzione giornaliera**: "Alexa, chiedi a fotovoltaico quanta energia ha prodotto oggi"
- **Display APL**: schermata con potenza e produzione su Echo Show/Hub
- **Widget**: widget per la home screen dell'Echo Hub con dati in tempo reale (via DataStore)

## Struttura del progetto

```
EnergyFlowV2/
  skill-package/
    skill.json                        # Manifest della skill
    interactionModels/custom/
      it-IT.json                      # Interaction model in italiano
    dataStorePackages/
      PVWidget/                       # APL package per il widget
        manifest.json                 # Package manifest
        documents/document.json       # Documento APL del widget
        datasources/default.json      # Datasource defaults
        presentations/default.tpl     # Presentation definition
  lambda/
    index.js                          # Router: EventBridge vs Alexa SDK
    util.js                           # API FusionSolar + LWA token + DataStore
    helpers.js                        # APL directive, safeNumber, supportsAPL
    messages.js                       # Stringhe vocali SSML in italiano
    handlers/
      solar.js                        # Launch, PotenzaAttuale, ProduzioneOggi
      widget.js                       # UsagesInstalled, UpdateRequest, UsagesRemoved
      builtin.js                      # Help, Cancel/Stop, Fallback, SessionEnded, Error
    package.json                      # Dipendenze Node.js
    apl/
      launch-document.json            # Documento APL per risposta su schermo
      widget-document.json            # Documento APL widget (referenza)
    __tests__/                        # Test con node:test (built-in)
      helpers.test.js
      util.test.js
      handlers.test.js
  icons/
    output/                           # Icone generate (caricate su S3)
  ask-resources.json                  # Configurazione ASK CLI
```

## Risorse AWS

| Risorsa | Dettaglio |
|---------|-----------|
| Skill ID | `amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db` |
| Lambda ARN | `arn:aws:lambda:eu-west-1:126437948323:function:alexa-fotovoltaico` |
| IAM Role | `alexa-fotovoltaico-lambda-role` |
| Region | `eu-west-1` (Irlanda) |

## Variabili d'ambiente Lambda

| Variabile | Descrizione |
|-----------|-------------|
| `KIOSK_TOKEN` | Token per l'endpoint kiosk di FusionSolar |
| `SKILL_CLIENT_ID` | Client ID per Login with Amazon (OAuth client_credentials) |
| `SKILL_CLIENT_SECRET` | Client Secret per Login with Amazon |
| `ALEXA_USER_ID` | User ID Alexa per aggiornamento schedulato del widget (opzionale) |

Le client credentials si ottengono dalla [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) > la skill > Permissions > tab Skills > Edit.

Per aggiornare le variabili:

```bash
aws lambda update-function-configuration \
  --function-name alexa-fotovoltaico \
  --environment "Variables={KIOSK_TOKEN=...,SKILL_CLIENT_ID=...,SKILL_CLIENT_SECRET=...,ALEXA_USER_ID=...}" \
  --region eu-west-1
```

## Aggiornare il codice Lambda

```bash
cd lambda
zip -r ../lambda-deploy.zip . -x "*.DS_Store" -x "__tests__/*"
aws lambda update-function-code \
  --function-name alexa-fotovoltaico \
  --zip-file fileb://../lambda-deploy.zip \
  --region eu-west-1
rm ../lambda-deploy.zip
```

## Aggiornare il manifest

```bash
ask smapi update-skill-manifest \
  -s amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db \
  --manifest "$(cat skill-package/skill.json)"
```

## Aggiornare l'interaction model

```bash
ask smapi set-interaction-model \
  -s amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db \
  --stage development --locale it-IT \
  --interaction-model "$(cat skill-package/interactionModels/custom/it-IT.json)"
```

## Test

```bash
cd lambda
npm test
```

### Simulazione skill

```bash
ask smapi simulate-skill \
  -s amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db \
  --device-locale it-IT \
  --input-content "apri fotovoltaico"

ask smapi get-skill-simulation \
  -s amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db \
  --simulation-id <ID>
```

## Widget

Il widget e' incluso nello skill package in `skill-package/dataStorePackages/PVWidget/`.
Viene deployato automaticamente con `ask deploy --target skill-metadata`.

Per visualizzarlo/modificarlo nella Developer Console:

1. Aprire la [Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Selezionare la skill "Fotovoltaico"
3. Andare in **Multimodal Responses** > **Widget**

Per testare il widget serve un Echo Hub/Show reale (non supportato nel simulatore).

### Deploy completo (skill metadata + widget)

```bash
ask deploy --target skill-metadata
```

## API FusionSolar

La skill usa l'endpoint kiosk pubblico:

```
GET https://uni005eu5.fusionsolar.huawei.com/rest/pvms/web/kiosk/v1/station-kiosk-file?kk=<TOKEN>
```

Dati estratti:
- `realKpi.realTimePower` -- potenza istantanea (kW)
- `realKpi.dailyEnergy` -- energia prodotta oggi (kWh)
- `realKpi.monthEnergy` -- energia prodotta nel mese (kWh)
