export const promptTemplates = {
  // Generate collection from API documentation
  generateCollection(apiSpec, options = {}) {
    const { collectionName, description } = options;
    
    return `You are an AI assistant that creates Bruno API collections from API documentation. 

Your task is to analyze the provided API documentation and create a structured collection of API endpoints.

IMPORTANT: Respond with a valid JSON object in the following format:
{
  "name": "Collection Name",
  "description": "Collection description",
  "endpoints": [
    {
      "name": "Endpoint Name",
      "method": "HTTP_METHOD",
      "url": "Full URL or path",
      "headers": [
        {
          "name": "Header Name",
          "value": "Header Value",
          "enabled": true
        }
      ],
      "body": "JSON string or null",
      "description": "Endpoint description"
    }
  ]
}

API Documentation:
${apiSpec}

${collectionName ? `Collection Name: ${collectionName}` : ''}
${description ? `Collection Description: ${description}` : ''}

Instructions:
1. Extract all API endpoints from the documentation
2. For each endpoint, determine the HTTP method, URL, and any required headers
3. If the documentation includes example request bodies, include them
4. Use descriptive names for each endpoint
5. Include common headers like Content-Type: application/json where appropriate
6. If authentication is mentioned, include appropriate headers (Authorization, API-Key, etc.)
7. Ensure all URLs are complete (include base URL if provided)

Respond only with the JSON object, no additional text or explanations.`;
  },

  // Generate tests for a single request
  generateTests(request, response = null, options = {}) {
    const { includeEdgeCases = true, focusOn = null } = options;
    
    let prompt = `You are an AI assistant that generates test cases for API requests in Bruno format.

Your task is to create comprehensive test cases for the following API request.

IMPORTANT: Respond with a valid JSON object in the following format:
{
  "tests": [
    {
      "name": "Test Name",
      "code": "test('Test description', () => { /* test code */ });",
      "description": "What this test validates"
    }
  ]
}

Request Details:
- Method: ${request.method}
- URL: ${request.url}
- Headers: ${JSON.stringify(request.headers || [], null, 2)}
${request.body ? `- Body: ${JSON.stringify(request.body, null, 2)}` : ''}

${response ? `
Response Example:
- Status: ${response.status}
- Body: ${JSON.stringify(response.body, null, 2)}
` : ''}

Test Requirements:
1. Test the response status code
2. Validate the response body structure and data types
3. Check for required fields in the response
4. ${includeEdgeCases ? 'Include edge cases and error scenarios' : 'Focus on happy path scenarios'}
5. Use Bruno's test syntax with \`req\` and \`res\` objects
6. ${focusOn ? `Focus on: ${focusOn}` : 'Cover all important aspects of the response'}

Example Bruno test syntax:
\`\`\`javascript
test('Should return 200 and valid user data', () => {
  expect(res.getStatus()).to.equal(200);
  const body = res.getBody();
  expect(body).to.be.an('object');
  expect(body).to.have.property('id');
  expect(body.id).to.be.a('number');
});
\`\`\`

Respond only with the JSON object, no additional text or explanations.`;

    return prompt;
  },

  // Generate tests for an entire collection
  generateCollectionTests(collection, options = {}) {
    const { includeEdgeCases = true, focusOn = null } = options;
    
    const requests = this.extractRequestsFromCollection(collection);
    
    let prompt = `You are an AI assistant that generates test cases for an entire API collection in Bruno format.

Your task is to create comprehensive test cases for all requests in the collection.

IMPORTANT: Respond with a valid JSON object in the following format:
{
  "requestTests": {
    "request_name_1": "test('Test description', () => { /* test code */ });",
    "request_name_2": "test('Test description', () => { /* test code */ });"
  }
}

Collection Details:
${JSON.stringify(collection, null, 2)}

Requests in Collection:
${requests.map(req => `- ${req.name}: ${req.method} ${req.url}`).join('\n')}

Test Requirements:
1. Create tests for each request in the collection
2. Test response status codes
3. Validate response body structure and data types
4. Check for required fields in responses
5. ${includeEdgeCases ? 'Include edge cases and error scenarios' : 'Focus on happy path scenarios'}
6. Use Bruno's test syntax with \`req\` and \`res\` objects
7. ${focusOn ? `Focus on: ${focusOn}` : 'Cover all important aspects of each response'}

Example Bruno test syntax:
\`\`\`javascript
test('Should return 200 and valid user data', () => {
  expect(res.getStatus()).to.equal(200);
  const body = res.getBody();
  expect(body).to.be.an('object');
  expect(body).to.have.property('id');
  expect(body.id).to.be.a('number');
});
\`\`\`

For each request, provide a test that validates the expected behavior. Use the request name as the key in the requestTests object.

Respond only with the JSON object, no additional text or explanations.`;

    return prompt;
  },

  // Helper method to extract requests from collection
  extractRequestsFromCollection(collection) {
    const requests = [];
    
    const extractRequests = (items) => {
      if (!items) return;
      
      items.forEach(item => {
        if (item.type === 'http-request') {
          requests.push({
            name: item.name,
            method: item.request?.method || 'GET',
            url: item.request?.url || '',
            headers: item.request?.headers || [],
            body: item.request?.body || null
          });
        } else if (item.items) {
          extractRequests(item.items);
        }
      });
    };
    
    if (collection.items) {
      extractRequests(collection.items);
    }
    
    return requests;
  },

  // Generate additional tests based on user request
  generateAdditionalTests(request, response, userRequest, existingTests = '') {
    return `You are an AI assistant that generates additional test cases for an API request based on user requirements.

Your task is to create additional test cases for the following API request based on the user's specific request.

IMPORTANT: Respond with a valid JSON object in the following format:
{
  "tests": [
    {
      "name": "Test Name",
      "code": "test('Test description', () => { /* test code */ });",
      "description": "What this test validates"
    }
  ]
}

Request Details:
- Method: ${request.method}
- URL: ${request.url}
- Headers: ${JSON.stringify(request.headers || [], null, 2)}
${request.body ? `- Body: ${JSON.stringify(request.body, null, 2)}` : ''}

${response ? `
Response Example:
- Status: ${response.status}
- Body: ${JSON.stringify(response.body, null, 2)}
` : ''}

${existingTests ? `
Existing Tests:
${existingTests}
` : ''}

User Request: ${userRequest}

Instructions:
1. Generate tests that specifically address the user's request
2. Do not duplicate existing tests
3. Use Bruno's test syntax with \`req\` and \`res\` objects
4. Focus on the specific scenario or edge case requested
5. Ensure tests are comprehensive for the requested functionality

Respond only with the JSON object, no additional text or explanations.`;
  }
}; 