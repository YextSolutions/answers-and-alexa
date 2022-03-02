const Alexa = require('ask-sdk-core');
const { retrieveLocation, retrieveFaqAnswer } = require('./api');

const REPROMT_MESSAGE = ' Is there anything else I can help you with today?';

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
        console.log('------ ENTERING FindBranchHandler -----')

        const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
 
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
                  .reprompt(REPROMT_MESSAGE)
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
                            .reprompt(REPROMT_MESSAGE)
                            .getResponse();
                    } else {
                        return responseBuilder
                            .speak(locationResponse.message)
                            .reprompt(REPROMT_MESSAGE)
                            .getResponse();
                    }
                }
            }
        } else {
            console.log('Request from stationary device...')

            const consentToken = requestEnvelope.context.System.user.permissions
                && requestEnvelope.context.System.user.permissions.consentToken;

            // Ask user's permission to allow the skill to use device address if it's not already permitted
            if (!consentToken) {
                return responseBuilder
                    .speak('Please enable Location permissions in the Amazon Alexa app.')
                    .withAskForPermissionsConsentCard(['read::alexa:device:all:address'])
                    .getResponse();
            }

            try {
                const { deviceId } = requestEnvelope.context.System.device;
                const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();

                // call Alexa Device API to get device address
                const address = await deviceAddressServiceClient.getFullAddress(deviceId);
          
                console.log('Address successfully retrieved, now responding to user.');
                
                if (address.addressLine1 === null && address.stateOrRegion === null) {
                    // Ask user to set device address if they have not already
                    return responseBuilder
                      .speak(`It looks like you don't have an address set. You can set your address from the companion app.`)
                      .getResponse();
                } else {
                    // retrieve the device address postal code
                    const locationResponse = await retrieveLocation({ postalCode: address.postalCode })

                    if(locationResponse.title){
                        return responseBuilder
                            .speak(locationResponse.message)
                            .withSimpleCard(locationResponse.title, locationResponse.message)
                            .reprompt(REPROMT_MESSAGE)
                            .getResponse();
                    } else {
                        return responseBuilder
                            .speak(locationResponse.message)
                            .reprompt(REPROMT_MESSAGE)
                            .getResponse();
                    }
                }

            } catch(error) {
                console.log(error)
                if (error.name !== 'ServiceError') {
                    const response = responseBuilder
                        .speak('Uh Oh. Looks like something went wrong.')
                        .getResponse();

                    return response;
                }
                throw error;
            }
        }
    }
};

const QuestionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'QuestionIntent';
    },
    async handle(handlerInput) {
        console.log('------ ENTERING QuestionHandler -----')

        const { responseBuilder, requestEnvelope } = handlerInput;

        // query is derived from the 'Query' slot value in the QuestionIntent
        const query = Alexa.getSlotValue(requestEnvelope, 'Query');
        const { question, answer } = await retrieveFaqAnswer(query);

        if(question){
            return responseBuilder
                .speak(answer + REPROMT_MESSAGE)
                .withSimpleCard(question, answer)
                .reprompt(REPROMT_MESSAGE)
                .getResponse();
        } else {
            return responseBuilder
                .speak(answer + REPROMT_MESSAGE)
                .reprompt(REPROMT_MESSAGE)
                .getResponse();
        }
    }
};

const NoHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        console.log('------ ENTERING NoHandler -----')

        const { responseBuilder } = handlerInput;

        return responseBuilder
            .speak('If you need anything else, head to our website. Goodbye!')
            .getResponse();

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
        QuestionIntentHandler,
        HelpIntentHandler,
        NoHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();