const Alexa = require('ask-sdk-core');
const { retrieveDeviceCountryAndPostalCode, retrieveLocation } = require('./api');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
      console.log('Starting Conversation...')
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .speak('Welcome to Second National Bank. How can I help you today?')
        .reprompt('How can I help you today?')
        .getResponse();
    },
  };

const FindBranchHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'FindBranchIntent';
    },
    async handle(handlerInput) {
        const { requestEnvelope, responseBuilder } = handlerInput;
 
        const isGeoSupported = requestEnvelope.context.System.device.supportedInterfaces.Geolocation;
        const geoObject = requestEnvelope.context.Geolocation;

        // Geolocation field only exists for mobile devices
        if (isGeoSupported) {
            console.log('Request from mobile device...');

            // Ask user's permission to allow the skill to use device location if it's not already permitted
            if ( ! geoObject || ! geoObject.coordinate ) {
                console.log('User needs to provide permission')

                return responseBuilder
                  .speak('Second National would like to use your location. To turn on location sharing, please go to your Alexa app, and follow the instructions.')
                  .withAskForPermissionsConsentCard(['alexa::devices:all:geolocation:read'])
                  .getResponse();
            } else {
                console.log('User has provided permission...')

                const ACCURACY_THRESHOLD = 100; // accuracy of 100 meters required
                if (geoObject && geoObject.coordinate && geoObject.coordinate.accuracyInMeters < ACCURACY_THRESHOLD ) { 
                    console.log(geoObject);  // Print the geo-coordinates object if accuracy is within 100 meters
                    
                    // retrieve the closest location using longitude and latitude
                    const locationResponse = await retrieveLocation({ lat: geoObject.coordinate.latitudeInDegrees, long: geoObject.coordinate.longitudeInDegrees })

                    if(locationResponse.title){
                        return responseBuilder
                        .speak(locationResponse.message)
                        .withSimpleCard(locationResponse.title, locationResponse.message)
                        .getResponse();
                    } else {
                        return responseBuilder
                        .speak(locationResponse.message)
                        .getResponse();
                    }
                }
            }
        // TODO: Need to test with Stationary Device
        } else {
            const deviceLocation = retrieveDeviceCountryAndPostalCode(handlerInput);
            console.log('Request from stationary device...')

            if(deviceLocation.postalCode) {
                console.log('GOT POSTAL CODE')
                const locationResponse = await retrieveLocation({ postalCode: deviceLocation.postalCode })

                if(locationResponse.title){
                    return responseBuilder
                    .speak(locationResponse.message)
                    .withSimpleCard(locationResponse.title, locationResponse.message)
                    .getResponse();
                } else {
                    return responseBuilder
                    .speak(locationResponse.message)
                    .getResponse();
                }
            } else if(deviceLocation.permissions) {
                console.log('ASKING FOR PERMISSION')
                return responseBuilder
                    .speak(deviceLocation.message)
                    .withAskForPermissionsConsentCard(deviceLocation.permissions)
                    .getResponse();
            } else {
                return responseBuilder
                    .speak(deviceLocation.message)
                    .getResponse();
            }
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        FindBranchHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    // .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();