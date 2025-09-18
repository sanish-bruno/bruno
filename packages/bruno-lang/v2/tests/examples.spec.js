const fs = require('fs');
const path = require('path');
const bruToJson = require('../src/bruToJson');

describe('Examples functionality', () => {
  describe('Fixture-based tests', () => {
    it('should parse examples-simple.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'examples-simple.bru'), 'utf8');
      const expected = require('./fixtures/examples-simple.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse examples-complex.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'examples-complex.bru'), 'utf8');
      const output = bruToJson(input);

      // Basic structure validation
      expect(output.meta).toBeDefined();
      expect(output.http).toBeDefined();
      expect(output.examples).toBeDefined();
      expect(Array.isArray(output.examples)).toBe(true);
      expect(output.examples).toHaveLength(3);

      // Check each example has the expected structure
      output.examples.forEach((example, index) => {
        expect(example.meta).toBeDefined();
        expect(example.http).toBeDefined();
        expect(example.headers).toBeDefined();
        expect(example.auth).toBeDefined();
        expect(example.body).toBeDefined();
        if (example.response) {
          expect(example.response.status).toBeDefined();
          expect(example.response.body).toBeDefined();
        }
      });

      // Check specific examples
      const jsonExample = output.examples[0];
      expect(jsonExample.meta.name).toBe('JSON API Example');
      expect(jsonExample.http.method).toBe('post');
      expect(jsonExample.auth.basic).toBeDefined();
      expect(jsonExample.body.json).toContain('"format": "json"');

      const xmlExample = output.examples[1];
      expect(xmlExample.meta.name).toBe('XML API Example');
      expect(xmlExample.auth.bearer).toBeDefined();
      expect(xmlExample.body.xml).toContain('<format>xml</format>');

      const textExample = output.examples[2];
      expect(textExample.meta.name).toBe('Text API Example');
      expect(textExample.auth.apikey).toBeDefined();
      expect(textExample.body.text).toContain('Format: text');
    });
  });
  describe('Basic examples parsing', () => {
    it('should parse a single example block', () => {
      const input = `
meta {
  name: Test API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  meta {
    name: Example Request
    type: http
  }
  
  get {
    url: https://api.example.com/example
  }
  
  headers {
    authorization: Bearer token123
  }
}`;

      const result = bruToJson(input);
      
      expect(result.examples).toBeDefined();
      expect(Array.isArray(result.examples)).toBe(true);
      expect(result.examples).toHaveLength(1);
      
      const example = result.examples[0];
      expect(example.meta).toBeDefined();
      expect(example.meta.name).toBe('Example Request');
      expect(example.http).toBeDefined();
      expect(example.http.method).toBe('get');
      expect(example.http.url).toBe('https://api.example.com/example');
      expect(example.headers).toBeDefined();
      expect(example.headers).toHaveLength(1);
      expect(example.headers[0].name).toBe('authorization');
      expect(example.headers[0].value).toBe('Bearer token123');
    });

    it('should parse multiple example blocks', () => {
      const input = `
meta {
  name: Test API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  meta {
    name: Example 1
    type: http
  }
  
  get {
    url: https://api.example.com/example1
  }
}

example {
  meta {
    name: Example 2
    type: http
  }
  
  post {
    url: https://api.example.com/example2
  }
  
  body:json {
    {
      "data": "test"
    }
  }
}`;

      const result = bruToJson(input);
      
      expect(result.examples).toBeDefined();
      expect(Array.isArray(result.examples)).toBe(true);
      expect(result.examples).toHaveLength(2);
      
      // Check first example
      expect(result.examples[0].meta.name).toBe('Example 1');
      expect(result.examples[0].http.method).toBe('get');
      expect(result.examples[0].http.url).toBe('https://api.example.com/example1');
      
      // Check second example
      expect(result.examples[1].meta.name).toBe('Example 2');
      expect(result.examples[1].http.method).toBe('post');
      expect(result.examples[1].http.url).toBe('https://api.example.com/example2');
      expect(result.examples[1].body).toBeDefined();
      expect(result.examples[1].body.json).toContain('"data": "test"');
    });

    it('should handle examples with response blocks', () => {
      const input = `
meta {
  name: Test API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  meta {
    name: Example with Response
    type: http
  }
  
  get {
    url: https://api.example.com/users/123
  }
  
  response:headers {
    content-type: application/json
  }
  
  response:status {
    code: 200
  }
  
  response:body:json {
    {
      "id": 123,
      "name": "John Doe"
    }
  }
}`;

      const result = bruToJson(input);
      
      expect(result.examples).toBeDefined();
      expect(result.examples).toHaveLength(1);
      
      const example = result.examples[0];
      expect(example.response).toBeDefined();
      expect(example.response.headers).toBeDefined();
      expect(example.response.headers[0].name).toBe('content-type');
      expect(example.response.headers[0].value).toBe('application/json');
      expect(example.response.status).toBeDefined();
      expect(example.response.status.code).toBe('200');
      expect(example.response.body).toBeDefined();
      expect(example.response.body.json).toContain('"id": 123');
    });
  });

  describe('Examples with different body types', () => {
    it('should handle examples with JSON body', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  meta {
    name: JSON Example
    type: http
  }
  
  post {
    url: https://api.example.com/data
  }
  
  body:json {
    {
      "name": "Test",
      "value": 123
    }
  }
}`;

      const result = bruToJson(input);
      const example = result.examples[0];
      
      expect(example.body).toBeDefined();
      expect(example.body.json).toContain('"name": "Test"');
      expect(example.body.json).toContain('"value": 123');
    });

    it('should handle examples with XML body', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  meta {
    name: XML Example
    type: http
  }
  
  post {
    url: https://api.example.com/data
  }
  
  body:xml {
    <?xml version="1.0" encoding="UTF-8"?>
    <data>
      <name>Test</name>
      <value>123</value>
    </data>
  }
}`;

      const result = bruToJson(input);
      const example = result.examples[0];
      
      expect(example.body).toBeDefined();
      expect(example.body.xml).toContain('<name>Test</name>');
      expect(example.body.xml).toContain('<value>123</value>');
    });

    it('should handle examples with text body', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  meta {
    name: Text Example
    type: http
  }
  
  post {
    url: https://api.example.com/data
  }
  
  body:text {
    Plain text data
    with multiple lines
  }
}`;

      const result = bruToJson(input);
      const example = result.examples[0];
      
      expect(example.body).toBeDefined();
      expect(example.body.text).toContain('Plain text data');
      expect(example.body.text).toContain('with multiple lines');
    });
  });

  describe('Examples with authentication', () => {
    it('should handle examples with basic auth', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  meta {
    name: Basic Auth Example
    type: http
  }
  
  get {
    url: https://api.example.com/protected
  }
  
  auth:basic {
    username: testuser
    password: testpass
  }
}`;

      const result = bruToJson(input);
      const example = result.examples[0];
      
      expect(example.auth).toBeDefined();
      expect(example.auth.basic).toBeDefined();
      expect(example.auth.basic.username).toBe('testuser');
      expect(example.auth.basic.password).toBe('testpass');
    });

    it('should handle examples with bearer token', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  meta {
    name: Bearer Token Example
    type: http
  }
  
  get {
    url: https://api.example.com/protected
  }
  
  auth:bearer {
    token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
  }
}`;

      const result = bruToJson(input);
      const example = result.examples[0];
      
      expect(example.auth).toBeDefined();
      expect(example.auth.bearer).toBeDefined();
      expect(example.auth.bearer.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty example blocks', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  
}`;

      const result = bruToJson(input);
      
      expect(result.examples).toBeDefined();
      expect(result.examples).toHaveLength(1);
      expect(result.examples[0]).toBeDefined();
    });

    it('should handle malformed example content gracefully', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  meta {
    name: Malformed Example
    type: http
  }
  
  invalid-syntax {
    this is not valid bru syntax
  }
}`;

      const result = bruToJson(input);
      
      expect(result.examples).toBeDefined();
      expect(result.examples).toHaveLength(1);
      // Should handle malformed content gracefully - may contain error
      expect(result.examples[0]).toBeDefined();
      // Either parsed successfully or contains error
      expect(result.examples[0].error || result.examples[0].meta).toBeDefined();
    });

    it('should work without any examples', () => {
      const input = `
meta {
  name: Test API
  type: http
}

get {
  url: https://api.example.com/test
}`;

      const result = bruToJson(input);
      
      expect(result.examples).toBeUndefined();
      expect(result.meta).toBeDefined();
      expect(result.http).toBeDefined();
    });
  });

  describe('Complex examples', () => {
    it('should handle examples with all features', () => {
      const input = `
meta {
  name: Complex API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  meta {
    name: Complete Example
    type: http
  }
  
  post {
    url: https://api.example.com/users
  }
  
  headers {
    content-type: application/json
    authorization: Bearer token123
  }
  
  params:query {
    page: 1
    limit: 10
  }
  
  auth:oauth2 {
    grant_type: client_credentials
    client_id: test-client
    client_secret: test-secret
    access_token_url: https://auth.example.com/token
  }
  
  body:json {
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  
  script:pre-request {
    console.log('Making request to create user');
  }
  
  script:post-response {
    console.log('User created successfully');
  }
  
  response:headers {
    content-type: application/json
    location: https://api.example.com/users/123
  }
  
  response:status {
    code: 201
  }
  
  response:body:json {
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2023-01-15T10:30:00Z"
    }
  }
}`;

      const result = bruToJson(input);
      
      expect(result.examples).toBeDefined();
      expect(result.examples).toHaveLength(1);
      
      const example = result.examples[0];
      
      // Check all features are present
      expect(example.meta).toBeDefined();
      expect(example.http).toBeDefined();
      expect(example.headers).toBeDefined();
      expect(example.params).toBeDefined();
      expect(example.auth).toBeDefined();
      expect(example.body).toBeDefined();
      expect(example.script).toBeDefined();
      expect(example.response).toBeDefined();
      
      // Check specific values
      expect(example.meta.name).toBe('Complete Example');
      expect(example.http.method).toBe('post');
      expect(example.headers).toHaveLength(2);
      expect(example.params).toHaveLength(2);
      expect(example.auth.oauth2).toBeDefined();
      expect(example.body.json).toContain('"name": "John Doe"');
      expect(example.script.req).toContain('Making request');
      expect(example.script.res).toContain('User created successfully');
      expect(example.response.status.code).toBe('201');
      expect(example.response.body.json).toContain('"id": 123');
    });
  });
});
