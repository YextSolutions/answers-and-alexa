const { provideCore } = require('@yext/answers-core');

const core = provideCore({
	apiKey: 'd99f8d1ece40714974c8da1912a1dfdb',
	experienceKey: 'chatbot-experience',
	locale: 'en',
  sessionTrackingEnabled: true,
  endpoints: {
    universalSearch: "https://liveapi-sandbox.yext.com/v2/accounts/me/answers/query",
    verticalSearch: "https://liveapi-sandbox.yext.com/v2/accounts/me/answers/vertical/query",
    questionSubmission: "https://liveapi-sandbox.yext.com/v2/accounts/me/createQuestion",
    universalAutocomplete: "https://liveapi-sandbox.yext.com/v2/accounts/me/answers/autocomplete",
    verticalAutocomplete: "https://liveapi-sandbox.yext.com/v2/accounts/me/answers/vertical/autocomplete",
    filterSearch: "https://liveapi-sandbox.yext.com/v2/accounts/me/answers/filtersearch"
  }
});

const retrieveAnswer = async (query, verticalKey, locationData) => {
  try {
    let searchResults = {};

    if(verticalKey === 'locations'){
      if(locationData.lat && locationData.long){
        searchResults = await core.verticalSearch({
          query,
          verticalKey,
          location: {
            latitude: locationData.lat,
            longitude: locationData.long
          },
          limit: 1
        });
      } else if (locationData.postalCode) {    
        searchResults = await core.verticalSearch({ query: `branches near ${locationData.postalCode}`, verticalKey, limit: 1 });
      }
      if(searchResults && searchResults.verticalResults.results.length > 0){
        console.log('Branch Found')
        const branchAddress = searchResults.verticalResults.results[0].rawData.address;
        return `We have a location near you at ${branchAddress.line1}, ${branchAddress.city}, ${branchAddress.region}.`; 
      } else {
        console.log('Could not find branch');
        return `Sorry, I was not able to find a branch near you.`
      }
    } else if(verticalKey === 'faqs') {
      return `${searchResults.verticalResults.results[0].rawData.answer}`;
    }
  } catch (err) {
    console.log(`Answers Error: ${err}`);
    // TODO: return some kind of string response on error
  }
}

const retrieveDeviceCountryAndPostalCode = async (handlerInput) => {
  try {
    const { requestEnvelope, serviceClientFactory } = handlerInput;
    const consentToken = requestEnvelope.context.System.user.permissions
        && requestEnvelope.context.System.user.permissions.consentToken;
    
    if (!consentToken) {
      // return responseBuilder
      //   .speak('Please enable Location permissions in the Amazon Alexa app.')
      //   .withAskForPermissionsConsentCard(['read::alexa:device:address:country_and_postal_code'])
      //   .getResponse();
      return {
        message: 'Please enable Location permissions in the Amazon Alexa app.',
        permissions: ['read::alexa:device:address:country_and_postal_code']
      }
    }

    const { deviceId } = requestEnvelope.context.System.device;
    const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
    const address = await deviceAddressServiceClient.getCountryAndPostalCode(deviceId);

    console.log('Address successfully retrieved, now responding to user.');

    return address;

  } catch (err) {
    if (error.name !== 'ServiceError') {
      const response = responseBuilder
        .speak('Uh Oh. Looks like something went wrong.')
        .getResponse();

      return response;
    }
    throw error;
  }
}

export { retrieveAnswer, retrieveDeviceCountryAndPostalCode };