const axios = require('axios');
const { CLI_VERSION } = require('../constants');

/**
 * Function that configures axios with timing interceptors
 * Important to note here that the timings are not completely accurate.
 * @see https://github.com/axios/axios/issues/695
 * @returns {axios.AxiosInstance}
 */
function makeAxiosInstance() {
  /** @type {axios.AxiosInstance} */
  const instance = axios.create({
    proxy: false,
    headers: {
      'User-Agent': `bruno-runtime/${CLI_VERSION}`
    }
  });

  instance.interceptors.request.use((config) => {
    config.headers['request-start-time'] = Date.now();
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const end = Date.now();
      const start = response.config.headers['request-start-time'];
      response.headers['request-duration'] = end - start;

      // Response size is calculated by summing the byte length of the body and the headers
      const headerSize = Object.keys(response.headers).reduce((total, key) => total + Buffer.byteLength(key + response.headers[key]), 0);
      const bodySize = Buffer.byteLength(response.data);
      const responseSize = {
        header: headerSize,
        body: bodySize,
        total: headerSize + bodySize
      };
      response.headers['response-size'] = responseSize;

      return response;
    },
    (error) => {
      if (error.response) {
        const end = Date.now();
        const start = error.config.headers['request-start-time'];
        error.response.headers['request-duration'] = end - start;

        // Response size is calculated by summing the byte length of the body and the headers
        const headerSize = Object.keys(error.response.headers).reduce(
          (total, key) => total + Buffer.byteLength(key + error.response.headers[key]),
          0
        );
        const bodySize = Buffer.byteLength(error.response.data);
        const responseSize = {
          header: headerSize,
          body: bodySize,
          total: headerSize + bodySize
        };
        error.response.headers['response-size'] = responseSize;
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

module.exports = {
  makeAxiosInstance
};
