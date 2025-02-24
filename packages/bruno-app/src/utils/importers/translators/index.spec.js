const { postmanTranslation } = require('./postman_translation'); // Adjust path as needed

describe('postmanTranslation function', () => {
  test('should translate pm commands correctly', () => {
    const inputScript = `
      pm.environment.get('key');
      pm.environment.set('key', 'value');
      pm.variables.get('key');
      pm.variables.set('key', 'value');
      pm.collectionVariables.get('key');
      pm.collectionVariables.set('key', 'value');
      const data = pm.response.json();
      pm.expect(pm.environment.has('key')).to.be.true;
      postman.setEnvironmentVariable('key', 'value');
      postman.getEnvironmentVariable('key');
      postman.clearEnvironmentVariable('key');
    `;
    const expectedOutput = `
      bru.getEnvVar('key');
      bru.setEnvVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
      const data = res.getBody();
      expect(bru.getEnvVar('key') !== undefined && bru.getEnvVar('key') !== null).to.be.true;
      bru.setEnvVar('key', 'value');
      bru.getEnvVar('key');
      bru.deleteEnvVar('key');
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should not translate non-pm commands', () => {
    const inputScript = `
      console.log('This script does not contain pm commands.');
      const data = pm.environment.get('key');
      pm.collectionVariables.set('key', data);
    `;
    const expectedOutput = `
      console.log('This script does not contain pm commands.');
      const data = bru.getEnvVar('key');
      bru.setVar('key', data);
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle multiple pm commands on the same line', () => {
    const inputScript = "pm.environment.get('key'); pm.environment.set('key', 'value');";
    const expectedOutput = "bru.getEnvVar('key'); bru.setEnvVar('key', 'value');";
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
  test('should handle comments and other JavaScript code', () => {
    const inputScript = `
      // This is a comment
      const value = 'test';
      pm.environment.set('key', value);
      /*
        Multi-line comment
      */
      const result = pm.environment.get('key');
      console.log('Result:', result);
    `;
    const expectedOutput = `
      // This is a comment
      const value = 'test';
      bru.setEnvVar('key', value);
      /*
        Multi-line comment
      */
      const result = bru.getEnvVar('key');
      console.log('Result:', result);
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle nested commands and edge cases', () => {
    const inputScript = `
      const sampleObjects = [
        {
          key: pm.environment.get('key'),
          value: pm.variables.get('value')
        },
        {
          key: pm.collectionVariables.get('key'),
          value: pm.collectionVariables.get('value')
        }
      ];
      const dataTesting = Object.entries(sampleObjects || {}).reduce((acc, [key, value]) => {
        // this is a comment
        acc[key] = pm.collectionVariables.get(pm.environment.get(value));
        return acc; // Return the accumulator
      }, {});
      Object.values(dataTesting).forEach((data) => {
        pm.environment.set(data.key, pm.variables.get(data.value));
      });
    `;
    const expectedOutput = `
      const sampleObjects = [
        {
          key: bru.getEnvVar('key'),
          value: bru.getVar('value')
        },
        {
          key: bru.getVar('key'),
          value: bru.getVar('value')
        }
      ];
      const dataTesting = Object.entries(sampleObjects || {}).reduce((acc, [key, value]) => {
        // this is a comment
        acc[key] = bru.getVar(bru.getEnvVar(value));
        return acc; // Return the accumulator
      }, {});
      Object.values(dataTesting).forEach((data) => {
        bru.setEnvVar(data.key, bru.getVar(data.value));
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle test commands', () => {
    const inputScript = `
      pm.test('Status code is 200', () => {
        pm.response.to.have.status(200);
      });
      pm.test('this test will fail', () => {
        return false
      });
    `;
    const expectedOutput = `
      test('Status code is 200', () => {
        expect(res.getStatus()).to.equal(200);
      });
      test('this test will fail', () => {
        return false
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle empty script gracefully', () => {
    const inputScript = ``;

    const result = postmanTranslation(inputScript);
    expect(result).toBe('');
  });

  test('should handle script with only comments', () => {
    const inputScript = `
      // This is a comment
      /*
        Multi-line comment
      */
    `;

    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(inputScript.trim());
  });

  test('should handle single line pm commands', () => {
    const inputScript = `
      pm.sendRequest({});
    `;
    const expectedOutput = `
//       pm.sendRequest({});
    `;
    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(expectedOutput.trim());
  });

  test('should handle script with commented out pm commands', () => {
    const inputScript = `
//       pm.sendRequest({
//         url: "https://jsonplaceholder.typicode.com/posts/1",
//         method: "GET",
//         header: {
//             "Content-Type": "application/json"
//         }
//       }, function (err, res) {
//           if (err) {
//               console.log("Request Error:", err);
//           } else {
//               console.log("Dynamic Request Status:", res.code);
//               bru.setEnvVar("response_data", res.json());
//           }
//       });
    `;

    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(inputScript.trim());
  });

  test('should comment out the entire pm block with // at the start of the line', () => {
    const inputScript = `
      pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
        header: {
            "Content-Type": "application/json"
        }
      }, function (err, res) {
          if (err) {
              console.log("Request Error:", err);
          } else {
              console.log("Dynamic Request Status:", res.code);
              pm.environment.set("response_data", res.json());
          }
      });
    `;

    const expectedOutput = `
//       pm.sendRequest({
//         url: "https://jsonplaceholder.typicode.com/posts/1",
//         method: "GET",
//         header: {
//             "Content-Type": "application/json"
//         }
//       }, function (err, res) {
//           if (err) {
//               console.log("Request Error:", err);
//           } else {
//               console.log("Dynamic Request Status:", res.code);
//               bru.setEnvVar("response_data", res.json());
//           }
//       });
    `;

    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(expectedOutput.trim());
  });

  test('should only comment out pm blocks and leave other code untouched', () => {
    const inputScript = `
    console.log('Start of script');

    pm.sendRequest({
      url: "https://jsonplaceholder.typicode.com/posts/1",
      method: "GET",
      header: {
          "Content-Type": "application/json"
      }
    }, function (err, res) {
        if (err) {
            console.log("Request Error:", err);
        } else {
            console.log("Dynamic Request Status:", res.code);
            pm.environment.set("response_data", res.json());
        }
    });

    console.log('End of script');
  `;

    const expectedOutput = `
    console.log('Start of script');

//     pm.sendRequest({
//       url: "https://jsonplaceholder.typicode.com/posts/1",
//       method: "GET",
//       header: {
//           "Content-Type": "application/json"
//       }
//     }, function (err, res) {
//         if (err) {
//             console.log("Request Error:", err);
//         } else {
//             console.log("Dynamic Request Status:", res.code);
//             bru.setEnvVar("response_data", res.json());
//         }
//     });

    console.log('End of script');
  `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should only comment out pm blocks correctly', () => {
    const inputScript = `
    pm.sendRequest({
      url: "https://jsonplaceholder.typicode.com/posts/1",
      method: "GET",
      header: {
          "Content-Type": "application/json"
      }
    }, function (err, res) {
        if (err) {
            console.log("Request Error:", err);
        } else {
            console.log("Dynamic Request Status:", res.code);
            pm.environment.set("response_data", res.json());
        }
        console.log({ res });
    });
  `;

    const expectedOutput = `
//     pm.sendRequest({
//       url: "https://jsonplaceholder.typicode.com/posts/1",
//       method: "GET",
//       header: {
//           "Content-Type": "application/json"
//       }
//     }, function (err, res) {
//         if (err) {
//             console.log("Request Error:", err);
//         } else {
//             console.log("Dynamic Request Status:", res.code);
//             bru.setEnvVar("response_data", res.json());
//         }
//         console.log({ res });
//     });
  `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should not modify scripts without pm or postman', () => {
    const inputScript = `
      console.log("This is a regular script.");
    `;

    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(inputScript.trim());
  });

  test('should handle empty script gracefully', () => {
    const inputScript = ``;

    const result = postmanTranslation(inputScript);
    expect(result).toBe('');
  });

  test('should handle script with only comments', () => {
    const inputScript = `
      // This is a comment
      /*
        Multi-line comment
      */
    `;

    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(inputScript.trim());
  });

  test('should handle single line pm commands', () => {
    const inputScript = `
      pm.sendRequest({});
    `;
    const expectedOutput = `
//       pm.sendRequest({});
    `;
    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(expectedOutput.trim());
  });

  test('should handle script with commented out pm commands', () => {
    const inputScript = `
//       pm.sendRequest({
//         url: "https://jsonplaceholder.typicode.com/posts/1",
//         method: "GET",
//         header: {
//             "Content-Type": "application/json"
//         }
//       }, function (err, res) {
//           if (err) {
//               console.log("Request Error:", err);
//           } else {
//               console.log("Dynamic Request Status:", res.code);
//               bru.setEnvVar("response_data", res.json());
//           }
//       });
    `;

    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(inputScript.trim());
  });

  test('should comment out the entire pm block with // at the start of the line', () => {
    const inputScript = `
      pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
        header: {
            "Content-Type": "application/json"
        }
      }, function (err, res) {
          if (err) {
              console.log("Request Error:", err);
          } else {
              console.log("Dynamic Request Status:", res.code);
              pm.environment.set("response_data", res.json());
          }
      });
    `;

    const expectedOutput = `
//       pm.sendRequest({
//         url: "https://jsonplaceholder.typicode.com/posts/1",
//         method: "GET",
//         header: {
//             "Content-Type": "application/json"
//         }
//       }, function (err, res) {
//           if (err) {
//               console.log("Request Error:", err);
//           } else {
//               console.log("Dynamic Request Status:", res.code);
//               bru.setEnvVar("response_data", res.json());
//           }
//       });
    `;

    const result = postmanTranslation(inputScript);
    expect(result.trim()).toBe(expectedOutput.trim());
  });

  test('should only comment out pm blocks and leave other code untouched', () => {
    const inputScript = `
      console.log('Start of script');

      pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
        header: {
            "Content-Type": "application/json"
        }
      }, function (err, res) {
          if (err) {
              console.log("Request Error:", err);
          } else {
              console.log("Dynamic Request Status:", res.code);
              pm.environment.set("response_data", res.json());
          }
      });

      console.log('End of script');
    `;

    const expectedOutput = `
      console.log('Start of script');

//       pm.sendRequest({
//         url: "https://jsonplaceholder.typicode.com/posts/1",
//         method: "GET",
//         header: {
//             "Content-Type": "application/json"
//         }
//       }, function (err, res) {
//           if (err) {
//               console.log("Request Error:", err);
//           } else {
//               console.log("Dynamic Request Status:", res.code);
//               bru.setEnvVar("response_data", res.json());
//           }
//       });

      console.log('End of script');
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should only comment out pm blocks correctly', () => {
    const inputScript = `
      pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
        header: {
            "Content-Type": "application/json"
        }
      }, function (err, res) {
          if (err) {
              console.log("Request Error:", err);
          } else {
              console.log("Dynamic Request Status:", res.code);
              pm.environment.set("response_data", res.json());
          }
          console.log({ res });
      });
    `;

    const expectedOutput = `
//       pm.sendRequest({
//         url: "https://jsonplaceholder.typicode.com/posts/1",
//         method: "GET",
//         header: {
//             "Content-Type": "application/json"
//         }
//       }, function (err, res) {
//           if (err) {
//               console.log("Request Error:", err);
//           } else {
//               console.log("Dynamic Request Status:", res.code);
//               bru.setEnvVar("response_data", res.json());
//           }
//           console.log({ res });
//       });
    `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle edge cases', () => {
    const inputScript = `
      const sampleObjects = [
        {
          key: pm.unknownFn.get('key'),
          value: pm.unKnownFn.get('value')
        },
      ];
    `;
    const expectedOutput = `
      const sampleObjects = [
        {
          key: pm.unknownFn.get('key'),
          value: pm.unKnownFn.get('value')
        },
      ];
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle edge cases', () => {
    const inputScript = `
      const sampleObjects = [
        {
          key: pm.sendRequest({}),
          value: pm.sendRequest({})
        },
      ];
    `;
    const expectedOutput = `
      const sampleObjects = [
        {
          key: pm.sendRequest({}),
          value: pm.sendRequest({})
        },
      ];
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle multiple unsupported pm commands in the same file', () => {
    const inputScript = `
      const value = 'test';
      pm.sendRequest({
        "key": value
      });
      console.log('This is a regular script.');
      console.log({ "key": value });
      pm.sendRequest({});
    `;
    const expectedOutput = `
      const value = 'test';
//       pm.sendRequest({
//         "key": value
//       });
      console.log('This is a regular script.');
      console.log({ "key": value });
//       pm.sendRequest({});
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should comment out unsupported pm commands without parentheses', () => {
    const inputScript = `
      const value = 'test';
      pm.untranslatedStatus;
      pm.untranslatedCode;
      pm.untranslatedText;
      pm.untranslatedResponseTime;
      `;
    const expectedOutput = `
      const value = 'test';
//       pm.untranslatedStatus;
//       pm.untranslatedCode;
//       pm.untranslatedText;
//       pm.untranslatedResponseTime;
      `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should not comment out already commented out line', () => {
    const inputScript = `
      const value = 'test';
//       pm.untranslatedStatus;
      pm.untranslatedCode;
      pm.untranslatedText;
      pm.untranslatedResponseTime;
      `;
    const expectedOutput = `
      const value = 'test';
//       pm.untranslatedStatus;
//       pm.untranslatedCode;
//       pm.untranslatedText;
//       pm.untranslatedResponseTime;
      `;

    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});

test('should handle response commands', () => {
  const inputScript = `
    const responseTime = pm.response.responseTime;
    const responseCode = pm.response.code;
    const responseText = pm.response.text();
  `;
  const expectedOutput = `
    const responseTime = res.getResponseTime();
    const responseCode = res.getStatus();
    const responseText = res.getBody()?.toString();
  `;
  expect(postmanTranslation(inputScript)).toBe(expectedOutput);
});

test('should handle tests object', () => {
  const inputScript = `
    tests['Status code is 200'] = responseCode.code === 200;
  `;
  const expectedOutput = `
    test("Status code is 200", function() { expect(Boolean(responseCode.code === 200)).to.be.true; });
  `;
  expect(postmanTranslation(inputScript)).toBe(expectedOutput);
});

test('should not modify scripts without pm or postman', () => {
  const inputScript = `
      console.log("This is a regular script.");
    `;

  const result = postmanTranslation(inputScript);
  expect(result.trim()).toBe(inputScript.trim());
});
