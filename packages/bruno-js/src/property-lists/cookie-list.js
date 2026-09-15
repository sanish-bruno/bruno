const { PropertyList } = require('./property-list');

// tough-cookie instances carry internals and circular references; scripts get the plain fields.
const toPlainCookie = ({ key, value, domain, path, secure, httpOnly, expires }) =>
  ({ key, value, domain, path, secure, httpOnly, expires });

/**
 * CookieList — `bru.cookies`. A view over the shared cookie jar scoped to the
 * current request URL. Reads snapshot the jar on every call; writes delegate to
 * the jar using its callback-or-promise convention (a Promise is returned when
 * no callback is given).
 */
class CookieList extends PropertyList {
  #getUrl;
  #interpolate;
  #createCookieJar;
  #getCookiesForUrl;

  static asyncWrites = true;

  /**
   * @param {object} wiring
   * @param {Function} wiring.getUrl - Returns the interpolated request URL (or falsy if unavailable)
   * @param {Function} wiring.interpolate - Interpolates variables in a string
   * @param {Function} wiring.createCookieJar - Factory that returns a cookie jar instance
   * @param {Function} wiring.getCookiesForUrl - Returns the cookies array for a URL
   */
  constructor({ getUrl, interpolate, createCookieJar, getCookiesForUrl }) {
    super();
    this.#getUrl = getUrl;
    this.#interpolate = interpolate;
    this.#createCookieJar = createCookieJar;
    this.#getCookiesForUrl = getCookiesForUrl;
    // jar() is a handle onto another object, not a write on this list, so it stays off the
    // prototype where writeMethodsOf() would otherwise hand it to the bridge as a write.
    Object.defineProperty(this, 'jar', { value: () => this.#jar(), writable: true, configurable: true });
  }

  read() {
    const url = this.#getUrl();
    return url ? this.#getCookiesForUrl(url).map(toPlainCookie) : [];
  }

  #settle(callback) {
    if (callback) return callback(undefined);
    return Promise.resolve();
  }

  add(cookieObj, callback) {
    return this.upsert(cookieObj, callback);
  }

  /** Set (or replace) a cookie in the jar for the current request URL. */
  upsert(cookieObj, callback) {
    if (!cookieObj || typeof cookieObj !== 'object') {
      const error = new Error('cookieObj must be a non-null object');
      if (callback) return callback(error);
      return Promise.reject(error);
    }
    const url = this.#getUrl();
    if (!url) return this.#settle(callback);
    return this.#createCookieJar().setCookie(url, cookieObj, callback);
  }

  /** Remove a cookie by name from the current request URL; a no-op without a name. */
  remove(name, callback) {
    const url = this.#getUrl();
    if (!url || !name) return this.#settle(callback);
    return this.#createCookieJar().deleteCookie(url, name, callback);
  }

  delete(name, callback) {
    return this.remove(name, callback);
  }

  /** Remove the cookies scoped to the current request URL only; jar().clear() is the global one. */
  clear(callback) {
    const url = this.#getUrl();
    if (!url) return this.#settle(callback);
    return this.#createCookieJar().deleteCookies(url, callback);
  }

  /**
   * A jar handle for cross-URL cookie operations. URL arguments are interpolated
   * with environment and collection variables.
   * @returns {{ getCookie, getCookies, setCookie, setCookies, deleteCookie, deleteCookies, hasCookie, clear }}
   */
  #jar() {
    const cookieJar = this.#createCookieJar();
    const url = (raw) => this.#interpolate(raw);

    return {
      getCookie: (u, cookieName, callback) => cookieJar.getCookie(url(u), cookieName, callback),
      getCookies: (u, callback) => cookieJar.getCookies(url(u), callback),
      setCookie: (u, nameOrCookieObj, valueOrCallback, maybeCallback) =>
        cookieJar.setCookie(url(u), nameOrCookieObj, valueOrCallback, maybeCallback),
      setCookies: (u, cookiesArray, callback) => cookieJar.setCookies(url(u), cookiesArray, callback),
      clear: (callback) => cookieJar.clear(callback),
      deleteCookies: (u, callback) => cookieJar.deleteCookies(url(u), callback),
      deleteCookie: (u, cookieName, callback) => cookieJar.deleteCookie(url(u), cookieName, callback),
      hasCookie: (u, cookieName, callback) => cookieJar.hasCookie(url(u), cookieName, callback)
    };
  }
}

module.exports = CookieList;
