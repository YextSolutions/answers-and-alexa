const { provideCore } = require('@yext/answers-core');

const core = provideCore({
	apiKey: 'd99f8d1ece40714974c8da1912a1dfdb',
	experienceKey: 'alexa',
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

const retrieveLocation = async (locationData) => {
  try {
    let searchResults = {};

    if(locationData.lat && locationData.long){
      searchResults = await core.verticalSearch({
        query: '',
        verticalKey: 'locations',
        location: {
          latitude: locationData.lat,
          longitude: locationData.long
        },
        limit: 1
      });
    } else if (locationData.postalCode) {    
      searchResults = await core.verticalSearch({ query: `branches near ${locationData.postalCode}`, verticalKey: 'locations', limit: 1 });
    }

    if(searchResults && searchResults.verticalResults.results.length > 0){
      console.log('Branch Found');
      const branchAddress = searchResults.verticalResults.results[0].rawData.address;
      return {
        title: 'Branch Found', 
        message: `We have a location near you at ${branchAddress.line1}, ${branchAddress.city}, ${branchAddress.region}.`
      } 
    } else {
      console.log('Could not find branch');
      return {
        message: `Sorry, I was not able to find a branch near you.`
      }
    }

  } catch (err) {
    console.log(`Answers Error: ${err}`);
    return {
      message: 'Uh Oh! It looks like something went wrong. Please try again.'
    }
  }
};

const retrieveFaqAnswer = async (query) => {
  try {
    searchResults = await core.verticalSearch({ query, verticalKey: 'faqs', limit: 1})

    if(searchResults && searchResults.verticalResults.results.length > 0){
      console.log('FAQ Found');
      const faqData = searchResults.verticalResults.results[0].rawData;
      const question = faqData.question;
      const answer = faqData.answer;
      return { question, answer }; 
    } else {
      console.log('No FAQ Found');
      return {
        answer: `Sorry, I don't have an answer for that.`
      }
    }
  } catch (err) {
    console.log(`Answers Error: ${err}`);
    return {
      answer: 'Uh Oh! It looks like something went wrong. Please try again.'
    }
  }
};

module.exports = {
  retrieveLocation,
  retrieveFaqAnswer
}