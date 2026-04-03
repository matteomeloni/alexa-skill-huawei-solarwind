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
      FotovoltaicoWidget/             # APL package per il widget
        manifest.json                 # Package manifest
        documents/document.json       # Documento APL del widget
        datasources/default.json      # Datasource (vuoto, usa DataStore)
        presentations/default.tpl     # Presentation definition
  lambda/
    index.js                          # Handler Alexa (vocali + widget lifecycle)
    util.js                           # API FusionSolar + DataStore helper
    package.json                      # Dipendenze Node.js
    apl/
      widget-document.json            # Copia del documento APL widget
      launch-document.json            # Documento APL per risposta su schermo
  ask-resources.json                  # Configurazione ASK CLI
```

## Risorse AWS

| Risorsa | Dettaglio |
|---------|-----------|
| Skill ID | `amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db` |
| Lambda ARN | `arn:aws:lambda:eu-west-1:126437948323:function:alexa-fotovoltaico` |
| IAM Role | `alexa-fotovoltaico-lambda-role` |
| Region | `eu-west-1` (Irlanda) |

## Aggiornare il codice Lambda

```bash
cd lambda
zip -r ../lambda-deploy.zip . -x "*.DS_Store"
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

## Testing

```bash
# Simulare "apri fotovoltaico"
ask smapi simulate-skill \
  -s amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db \
  --device-locale it-IT \
  --input-content "apri fotovoltaico"

# Recuperare il risultato
ask smapi get-skill-simulation \
  -s amzn1.ask.skill.f6aadf83-0f5d-43ff-875c-d77673d8b9db \
  --simulation-id <ID>
```

## Widget

Il widget e' incluso nello skill package in `skill-package/dataStorePackages/FotovoltaicoWidget/`.
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

## Variabili d'ambiente Lambda

| Variabile | Descrizione |
|-----------|-------------|
| `KIOSK_TOKEN` | Token per l'endpoint kiosk di FusionSolar |

Per aggiornare il token:

```bash
aws lambda update-function-configuration \
  --function-name alexa-fotovoltaico \
  --environment "Variables={KIOSK_TOKEN=<nuovo-token>}" \
  --region eu-west-1
```

## API FusionSolar

La skill usa l'endpoint kiosk pubblico:

```
GET https://uni005eu5.fusionsolar.huawei.com/rest/pvms/web/kiosk/v1/station-kiosk-file?kk=<TOKEN>
```

Dati estratti:
- `realKpi.realTimePower` -- potenza istantanea (kW)
- `realKpi.dailyEnergy` -- energia prodotta oggi (kWh)
