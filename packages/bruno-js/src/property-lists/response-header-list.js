const { PropertyList, mirrorAsReadOnly } = require('./property-list');
const RequestHeaderList = require('./request-header-list');
const { httpWire, postmanHeaders } = require('./serializers');

/**
 * ResponseHeaderList — `res.headerList`. A read-only snapshot of the response
 * headers; the header write API exists so scripts get the reason instead of
 * "not a function".
 */
class ResponseHeaderList extends PropertyList {
  #items;

  static errors = {
    readonly: () => 'HeaderList is read-only (response headers cannot be modified)'
  };

  /**
   * @param {object|null} res - The response object; `headers` may be absent
   */
  constructor(res) {
    super({ caseInsensitive: true, uniqueKeys: true, stringify: httpWire, objectify: postmanHeaders });
    const rawHeaders = (res && res.headers) || {};
    this.#items = Object.entries(rawHeaders).map(([key, value]) => ({ key, value }));
  }

  read() {
    return [...this.#items];
  }
}

module.exports = mirrorAsReadOnly(ResponseHeaderList, RequestHeaderList);
