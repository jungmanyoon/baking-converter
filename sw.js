try {
  self["workbox:core:7.2.0"] && _();
} catch {
}
const M = (a, ...e) => {
  let t = a;
  return e.length > 0 && (t += ` :: ${JSON.stringify(e)}`), t;
}, S = M;
class l extends Error {
  /**
   *
   * @param {string} errorCode The error code that
   * identifies this particular error.
   * @param {Object=} details Any relevant arguments
   * that will help developers identify issues should
   * be added as a key on the context object.
   */
  constructor(e, t) {
    const s = S(e, t);
    super(s), this.name = e, this.details = t;
  }
}
const f = {
  googleAnalytics: "googleAnalytics",
  precache: "precache-v2",
  prefix: "workbox",
  runtime: "runtime",
  suffix: typeof registration < "u" ? registration.scope : ""
}, U = (a) => [f.prefix, a, f.suffix].filter((e) => e && e.length > 0).join("-"), W = (a) => {
  for (const e of Object.keys(f))
    a(e);
}, b = {
  updateDetails: (a) => {
    W((e) => {
      typeof a[e] == "string" && (f[e] = a[e]);
    });
  },
  getGoogleAnalyticsName: (a) => a || U(f.googleAnalytics),
  getPrecacheName: (a) => a || U(f.precache),
  getPrefix: () => f.prefix,
  getRuntimeName: (a) => a || U(f.runtime),
  getSuffix: () => f.suffix
};
function K(a, e) {
  const t = e();
  return a.waitUntil(t), t;
}
try {
  self["workbox:precaching:7.2.0"] && _();
} catch {
}
const D = "__WB_REVISION__";
function H(a) {
  if (!a)
    throw new l("add-to-cache-list-unexpected-type", { entry: a });
  if (typeof a == "string") {
    const c = new URL(a, location.href);
    return {
      cacheKey: c.href,
      url: c.href
    };
  }
  const { revision: e, url: t } = a;
  if (!t)
    throw new l("add-to-cache-list-unexpected-type", { entry: a });
  if (!e) {
    const c = new URL(t, location.href);
    return {
      cacheKey: c.href,
      url: c.href
    };
  }
  const s = new URL(t, location.href), n = new URL(t, location.href);
  return s.searchParams.set(D, e), {
    cacheKey: s.href,
    url: n.href
  };
}
class F {
  constructor() {
    this.updatedURLs = [], this.notUpdatedURLs = [], this.handlerWillStart = async ({ request: e, state: t }) => {
      t && (t.originalRequest = e);
    }, this.cachedResponseWillBeUsed = async ({ event: e, state: t, cachedResponse: s }) => {
      if (e.type === "install" && t && t.originalRequest && t.originalRequest instanceof Request) {
        const n = t.originalRequest.url;
        s ? this.notUpdatedURLs.push(n) : this.updatedURLs.push(n);
      }
      return s;
    };
  }
}
class j {
  constructor({ precacheController: e }) {
    this.cacheKeyWillBeUsed = async ({ request: t, params: s }) => {
      const n = (s == null ? void 0 : s.cacheKey) || this._precacheController.getCacheKeyForURL(t.url);
      return n ? new Request(n, { headers: t.headers }) : t;
    }, this._precacheController = e;
  }
}
let g;
function q() {
  if (g === void 0) {
    const a = new Response("");
    if ("body" in a)
      try {
        new Response(a.body), g = !0;
      } catch {
        g = !1;
      }
    g = !1;
  }
  return g;
}
async function B(a, e) {
  let t = null;
  if (a.url && (t = new URL(a.url).origin), t !== self.location.origin)
    throw new l("cross-origin-copy-response", { origin: t });
  const s = a.clone(), c = {
    headers: new Headers(s.headers),
    status: s.status,
    statusText: s.statusText
  }, i = q() ? s.body : await s.blob();
  return new Response(i, c);
}
const $ = (a) => new URL(String(a), location.href).href.replace(new RegExp(`^${location.origin}`), "");
function T(a, e) {
  const t = new URL(a);
  for (const s of e)
    t.searchParams.delete(s);
  return t.href;
}
async function G(a, e, t, s) {
  const n = T(e.url, t);
  if (e.url === n)
    return a.match(e, s);
  const c = Object.assign(Object.assign({}, s), { ignoreSearch: !0 }), i = await a.keys(e, c);
  for (const r of i) {
    const o = T(r.url, t);
    if (n === o)
      return a.match(r, s);
  }
}
class V {
  /**
   * Creates a promise and exposes its resolve and reject functions as methods.
   */
  constructor() {
    this.promise = new Promise((e, t) => {
      this.resolve = e, this.reject = t;
    });
  }
}
const J = /* @__PURE__ */ new Set();
async function Q() {
  for (const a of J)
    await a();
}
function z(a) {
  return new Promise((e) => setTimeout(e, a));
}
try {
  self["workbox:strategies:7.2.0"] && _();
} catch {
}
function m(a) {
  return typeof a == "string" ? new Request(a) : a;
}
class Y {
  /**
   * Creates a new instance associated with the passed strategy and event
   * that's handling the request.
   *
   * The constructor also initializes the state that will be passed to each of
   * the plugins handling this request.
   *
   * @param {workbox-strategies.Strategy} strategy
   * @param {Object} options
   * @param {Request|string} options.request A request to run this strategy for.
   * @param {ExtendableEvent} options.event The event associated with the
   *     request.
   * @param {URL} [options.url]
   * @param {*} [options.params] The return value from the
   *     {@link workbox-routing~matchCallback} (if applicable).
   */
  constructor(e, t) {
    this._cacheKeys = {}, Object.assign(this, t), this.event = t.event, this._strategy = e, this._handlerDeferred = new V(), this._extendLifetimePromises = [], this._plugins = [...e.plugins], this._pluginStateMap = /* @__PURE__ */ new Map();
    for (const s of this._plugins)
      this._pluginStateMap.set(s, {});
    this.event.waitUntil(this._handlerDeferred.promise);
  }
  /**
   * Fetches a given request (and invokes any applicable plugin callback
   * methods) using the `fetchOptions` (for non-navigation requests) and
   * `plugins` defined on the `Strategy` object.
   *
   * The following plugin lifecycle methods are invoked when using this method:
   * - `requestWillFetch()`
   * - `fetchDidSucceed()`
   * - `fetchDidFail()`
   *
   * @param {Request|string} input The URL or request to fetch.
   * @return {Promise<Response>}
   */
  async fetch(e) {
    const { event: t } = this;
    let s = m(e);
    if (s.mode === "navigate" && t instanceof FetchEvent && t.preloadResponse) {
      const i = await t.preloadResponse;
      if (i)
        return i;
    }
    const n = this.hasCallback("fetchDidFail") ? s.clone() : null;
    try {
      for (const i of this.iterateCallbacks("requestWillFetch"))
        s = await i({ request: s.clone(), event: t });
    } catch (i) {
      if (i instanceof Error)
        throw new l("plugin-error-request-will-fetch", {
          thrownErrorMessage: i.message
        });
    }
    const c = s.clone();
    try {
      let i;
      i = await fetch(s, s.mode === "navigate" ? void 0 : this._strategy.fetchOptions);
      for (const r of this.iterateCallbacks("fetchDidSucceed"))
        i = await r({
          event: t,
          request: c,
          response: i
        });
      return i;
    } catch (i) {
      throw n && await this.runCallbacks("fetchDidFail", {
        error: i,
        event: t,
        originalRequest: n.clone(),
        request: c.clone()
      }), i;
    }
  }
  /**
   * Calls `this.fetch()` and (in the background) runs `this.cachePut()` on
   * the response generated by `this.fetch()`.
   *
   * The call to `this.cachePut()` automatically invokes `this.waitUntil()`,
   * so you do not have to manually call `waitUntil()` on the event.
   *
   * @param {Request|string} input The request or URL to fetch and cache.
   * @return {Promise<Response>}
   */
  async fetchAndCachePut(e) {
    const t = await this.fetch(e), s = t.clone();
    return this.waitUntil(this.cachePut(e, s)), t;
  }
  /**
   * Matches a request from the cache (and invokes any applicable plugin
   * callback methods) using the `cacheName`, `matchOptions`, and `plugins`
   * defined on the strategy object.
   *
   * The following plugin lifecycle methods are invoked when using this method:
   * - cacheKeyWillBeUsed()
   * - cachedResponseWillBeUsed()
   *
   * @param {Request|string} key The Request or URL to use as the cache key.
   * @return {Promise<Response|undefined>} A matching response, if found.
   */
  async cacheMatch(e) {
    const t = m(e);
    let s;
    const { cacheName: n, matchOptions: c } = this._strategy, i = await this.getCacheKey(t, "read"), r = Object.assign(Object.assign({}, c), { cacheName: n });
    s = await caches.match(i, r);
    for (const o of this.iterateCallbacks("cachedResponseWillBeUsed"))
      s = await o({
        cacheName: n,
        matchOptions: c,
        cachedResponse: s,
        request: i,
        event: this.event
      }) || void 0;
    return s;
  }
  /**
   * Puts a request/response pair in the cache (and invokes any applicable
   * plugin callback methods) using the `cacheName` and `plugins` defined on
   * the strategy object.
   *
   * The following plugin lifecycle methods are invoked when using this method:
   * - cacheKeyWillBeUsed()
   * - cacheWillUpdate()
   * - cacheDidUpdate()
   *
   * @param {Request|string} key The request or URL to use as the cache key.
   * @param {Response} response The response to cache.
   * @return {Promise<boolean>} `false` if a cacheWillUpdate caused the response
   * not be cached, and `true` otherwise.
   */
  async cachePut(e, t) {
    const s = m(e);
    await z(0);
    const n = await this.getCacheKey(s, "write");
    if (!t)
      throw new l("cache-put-with-no-response", {
        url: $(n.url)
      });
    const c = await this._ensureResponseSafeToCache(t);
    if (!c)
      return !1;
    const { cacheName: i, matchOptions: r } = this._strategy, o = await self.caches.open(i), h = this.hasCallback("cacheDidUpdate"), p = h ? await G(
      // TODO(philipwalton): the `__WB_REVISION__` param is a precaching
      // feature. Consider into ways to only add this behavior if using
      // precaching.
      o,
      n.clone(),
      ["__WB_REVISION__"],
      r
    ) : null;
    try {
      await o.put(n, h ? c.clone() : c);
    } catch (u) {
      if (u instanceof Error)
        throw u.name === "QuotaExceededError" && await Q(), u;
    }
    for (const u of this.iterateCallbacks("cacheDidUpdate"))
      await u({
        cacheName: i,
        oldResponse: p,
        newResponse: c.clone(),
        request: n,
        event: this.event
      });
    return !0;
  }
  /**
   * Checks the list of plugins for the `cacheKeyWillBeUsed` callback, and
   * executes any of those callbacks found in sequence. The final `Request`
   * object returned by the last plugin is treated as the cache key for cache
   * reads and/or writes. If no `cacheKeyWillBeUsed` plugin callbacks have
   * been registered, the passed request is returned unmodified
   *
   * @param {Request} request
   * @param {string} mode
   * @return {Promise<Request>}
   */
  async getCacheKey(e, t) {
    const s = `${e.url} | ${t}`;
    if (!this._cacheKeys[s]) {
      let n = e;
      for (const c of this.iterateCallbacks("cacheKeyWillBeUsed"))
        n = m(await c({
          mode: t,
          request: n,
          event: this.event,
          // params has a type any can't change right now.
          params: this.params
          // eslint-disable-line
        }));
      this._cacheKeys[s] = n;
    }
    return this._cacheKeys[s];
  }
  /**
   * Returns true if the strategy has at least one plugin with the given
   * callback.
   *
   * @param {string} name The name of the callback to check for.
   * @return {boolean}
   */
  hasCallback(e) {
    for (const t of this._strategy.plugins)
      if (e in t)
        return !0;
    return !1;
  }
  /**
   * Runs all plugin callbacks matching the given name, in order, passing the
   * given param object (merged ith the current plugin state) as the only
   * argument.
   *
   * Note: since this method runs all plugins, it's not suitable for cases
   * where the return value of a callback needs to be applied prior to calling
   * the next callback. See
   * {@link workbox-strategies.StrategyHandler#iterateCallbacks}
   * below for how to handle that case.
   *
   * @param {string} name The name of the callback to run within each plugin.
   * @param {Object} param The object to pass as the first (and only) param
   *     when executing each callback. This object will be merged with the
   *     current plugin state prior to callback execution.
   */
  async runCallbacks(e, t) {
    for (const s of this.iterateCallbacks(e))
      await s(t);
  }
  /**
   * Accepts a callback and returns an iterable of matching plugin callbacks,
   * where each callback is wrapped with the current handler state (i.e. when
   * you call each callback, whatever object parameter you pass it will
   * be merged with the plugin's current state).
   *
   * @param {string} name The name fo the callback to run
   * @return {Array<Function>}
   */
  *iterateCallbacks(e) {
    for (const t of this._strategy.plugins)
      if (typeof t[e] == "function") {
        const s = this._pluginStateMap.get(t);
        yield (c) => {
          const i = Object.assign(Object.assign({}, c), { state: s });
          return t[e](i);
        };
      }
  }
  /**
   * Adds a promise to the
   * [extend lifetime promises]{@link https://w3c.github.io/ServiceWorker/#extendableevent-extend-lifetime-promises}
   * of the event event associated with the request being handled (usually a
   * `FetchEvent`).
   *
   * Note: you can await
   * {@link workbox-strategies.StrategyHandler~doneWaiting}
   * to know when all added promises have settled.
   *
   * @param {Promise} promise A promise to add to the extend lifetime promises
   *     of the event that triggered the request.
   */
  waitUntil(e) {
    return this._extendLifetimePromises.push(e), e;
  }
  /**
   * Returns a promise that resolves once all promises passed to
   * {@link workbox-strategies.StrategyHandler~waitUntil}
   * have settled.
   *
   * Note: any work done after `doneWaiting()` settles should be manually
   * passed to an event's `waitUntil()` method (not this handler's
   * `waitUntil()` method), otherwise the service worker thread my be killed
   * prior to your work completing.
   */
  async doneWaiting() {
    let e;
    for (; e = this._extendLifetimePromises.shift(); )
      await e;
  }
  /**
   * Stops running the strategy and immediately resolves any pending
   * `waitUntil()` promises.
   */
  destroy() {
    this._handlerDeferred.resolve(null);
  }
  /**
   * This method will call cacheWillUpdate on the available plugins (or use
   * status === 200) to determine if the Response is safe and valid to cache.
   *
   * @param {Request} options.request
   * @param {Response} options.response
   * @return {Promise<Response|undefined>}
   *
   * @private
   */
  async _ensureResponseSafeToCache(e) {
    let t = e, s = !1;
    for (const n of this.iterateCallbacks("cacheWillUpdate"))
      if (t = await n({
        request: this.request,
        response: t,
        event: this.event
      }) || void 0, s = !0, !t)
        break;
    return s || t && t.status !== 200 && (t = void 0), t;
  }
}
class X {
  /**
   * Creates a new instance of the strategy and sets all documented option
   * properties as public instance properties.
   *
   * Note: if a custom strategy class extends the base Strategy class and does
   * not need more than these properties, it does not need to define its own
   * constructor.
   *
   * @param {Object} [options]
   * @param {string} [options.cacheName] Cache name to store and retrieve
   * requests. Defaults to the cache names provided by
   * {@link workbox-core.cacheNames}.
   * @param {Array<Object>} [options.plugins] [Plugins]{@link https://developers.google.com/web/tools/workbox/guides/using-plugins}
   * to use in conjunction with this caching strategy.
   * @param {Object} [options.fetchOptions] Values passed along to the
   * [`init`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters)
   * of [non-navigation](https://github.com/GoogleChrome/workbox/issues/1796)
   * `fetch()` requests made by this strategy.
   * @param {Object} [options.matchOptions] The
   * [`CacheQueryOptions`]{@link https://w3c.github.io/ServiceWorker/#dictdef-cachequeryoptions}
   * for any `cache.match()` or `cache.put()` calls made by this strategy.
   */
  constructor(e = {}) {
    this.cacheName = b.getRuntimeName(e.cacheName), this.plugins = e.plugins || [], this.fetchOptions = e.fetchOptions, this.matchOptions = e.matchOptions;
  }
  /**
   * Perform a request strategy and returns a `Promise` that will resolve with
   * a `Response`, invoking all relevant plugin callbacks.
   *
   * When a strategy instance is registered with a Workbox
   * {@link workbox-routing.Route}, this method is automatically
   * called when the route matches.
   *
   * Alternatively, this method can be used in a standalone `FetchEvent`
   * listener by passing it to `event.respondWith()`.
   *
   * @param {FetchEvent|Object} options A `FetchEvent` or an object with the
   *     properties listed below.
   * @param {Request|string} options.request A request to run this strategy for.
   * @param {ExtendableEvent} options.event The event associated with the
   *     request.
   * @param {URL} [options.url]
   * @param {*} [options.params]
   */
  handle(e) {
    const [t] = this.handleAll(e);
    return t;
  }
  /**
   * Similar to {@link workbox-strategies.Strategy~handle}, but
   * instead of just returning a `Promise` that resolves to a `Response` it
   * it will return an tuple of `[response, done]` promises, where the former
   * (`response`) is equivalent to what `handle()` returns, and the latter is a
   * Promise that will resolve once any promises that were added to
   * `event.waitUntil()` as part of performing the strategy have completed.
   *
   * You can await the `done` promise to ensure any extra work performed by
   * the strategy (usually caching responses) completes successfully.
   *
   * @param {FetchEvent|Object} options A `FetchEvent` or an object with the
   *     properties listed below.
   * @param {Request|string} options.request A request to run this strategy for.
   * @param {ExtendableEvent} options.event The event associated with the
   *     request.
   * @param {URL} [options.url]
   * @param {*} [options.params]
   * @return {Array<Promise>} A tuple of [response, done]
   *     promises that can be used to determine when the response resolves as
   *     well as when the handler has completed all its work.
   */
  handleAll(e) {
    e instanceof FetchEvent && (e = {
      event: e,
      request: e.request
    });
    const t = e.event, s = typeof e.request == "string" ? new Request(e.request) : e.request, n = "params" in e ? e.params : void 0, c = new Y(this, { event: t, request: s, params: n }), i = this._getResponse(c, s, t), r = this._awaitComplete(i, c, s, t);
    return [i, r];
  }
  async _getResponse(e, t, s) {
    await e.runCallbacks("handlerWillStart", { event: s, request: t });
    let n;
    try {
      if (n = await this._handle(t, e), !n || n.type === "error")
        throw new l("no-response", { url: t.url });
    } catch (c) {
      if (c instanceof Error) {
        for (const i of e.iterateCallbacks("handlerDidError"))
          if (n = await i({ error: c, event: s, request: t }), n)
            break;
      }
      if (!n)
        throw c;
    }
    for (const c of e.iterateCallbacks("handlerWillRespond"))
      n = await c({ event: s, request: t, response: n });
    return n;
  }
  async _awaitComplete(e, t, s, n) {
    let c, i;
    try {
      c = await e;
    } catch {
    }
    try {
      await t.runCallbacks("handlerDidRespond", {
        event: n,
        request: s,
        response: c
      }), await t.doneWaiting();
    } catch (r) {
      r instanceof Error && (i = r);
    }
    if (await t.runCallbacks("handlerDidComplete", {
      event: n,
      request: s,
      response: c,
      error: i
    }), t.destroy(), i)
      throw i;
  }
}
class d extends X {
  /**
   *
   * @param {Object} [options]
   * @param {string} [options.cacheName] Cache name to store and retrieve
   * requests. Defaults to the cache names provided by
   * {@link workbox-core.cacheNames}.
   * @param {Array<Object>} [options.plugins] {@link https://developers.google.com/web/tools/workbox/guides/using-plugins|Plugins}
   * to use in conjunction with this caching strategy.
   * @param {Object} [options.fetchOptions] Values passed along to the
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters|init}
   * of all fetch() requests made by this strategy.
   * @param {Object} [options.matchOptions] The
   * {@link https://w3c.github.io/ServiceWorker/#dictdef-cachequeryoptions|CacheQueryOptions}
   * for any `cache.match()` or `cache.put()` calls made by this strategy.
   * @param {boolean} [options.fallbackToNetwork=true] Whether to attempt to
   * get the response from the network if there's a precache miss.
   */
  constructor(e = {}) {
    e.cacheName = b.getPrecacheName(e.cacheName), super(e), this._fallbackToNetwork = e.fallbackToNetwork !== !1, this.plugins.push(d.copyRedirectedCacheableResponsesPlugin);
  }
  /**
   * @private
   * @param {Request|string} request A request to run this strategy for.
   * @param {workbox-strategies.StrategyHandler} handler The event that
   *     triggered the request.
   * @return {Promise<Response>}
   */
  async _handle(e, t) {
    const s = await t.cacheMatch(e);
    return s || (t.event && t.event.type === "install" ? await this._handleInstall(e, t) : await this._handleFetch(e, t));
  }
  async _handleFetch(e, t) {
    let s;
    const n = t.params || {};
    if (this._fallbackToNetwork) {
      const c = n.integrity, i = e.integrity, r = !i || i === c;
      s = await t.fetch(new Request(e, {
        integrity: e.mode !== "no-cors" ? i || c : void 0
      })), c && r && e.mode !== "no-cors" && (this._useDefaultCacheabilityPluginIfNeeded(), await t.cachePut(e, s.clone()));
    } else
      throw new l("missing-precache-entry", {
        cacheName: this.cacheName,
        url: e.url
      });
    return s;
  }
  async _handleInstall(e, t) {
    this._useDefaultCacheabilityPluginIfNeeded();
    const s = await t.fetch(e);
    if (!await t.cachePut(e, s.clone()))
      throw new l("bad-precaching-response", {
        url: e.url,
        status: s.status
      });
    return s;
  }
  /**
   * This method is complex, as there a number of things to account for:
   *
   * The `plugins` array can be set at construction, and/or it might be added to
   * to at any time before the strategy is used.
   *
   * At the time the strategy is used (i.e. during an `install` event), there
   * needs to be at least one plugin that implements `cacheWillUpdate` in the
   * array, other than `copyRedirectedCacheableResponsesPlugin`.
   *
   * - If this method is called and there are no suitable `cacheWillUpdate`
   * plugins, we need to add `defaultPrecacheCacheabilityPlugin`.
   *
   * - If this method is called and there is exactly one `cacheWillUpdate`, then
   * we don't have to do anything (this might be a previously added
   * `defaultPrecacheCacheabilityPlugin`, or it might be a custom plugin).
   *
   * - If this method is called and there is more than one `cacheWillUpdate`,
   * then we need to check if one is `defaultPrecacheCacheabilityPlugin`. If so,
   * we need to remove it. (This situation is unlikely, but it could happen if
   * the strategy is used multiple times, the first without a `cacheWillUpdate`,
   * and then later on after manually adding a custom `cacheWillUpdate`.)
   *
   * See https://github.com/GoogleChrome/workbox/issues/2737 for more context.
   *
   * @private
   */
  _useDefaultCacheabilityPluginIfNeeded() {
    let e = null, t = 0;
    for (const [s, n] of this.plugins.entries())
      n !== d.copyRedirectedCacheableResponsesPlugin && (n === d.defaultPrecacheCacheabilityPlugin && (e = s), n.cacheWillUpdate && t++);
    t === 0 ? this.plugins.push(d.defaultPrecacheCacheabilityPlugin) : t > 1 && e !== null && this.plugins.splice(e, 1);
  }
}
d.defaultPrecacheCacheabilityPlugin = {
  async cacheWillUpdate({ response: a }) {
    return !a || a.status >= 400 ? null : a;
  }
};
d.copyRedirectedCacheableResponsesPlugin = {
  async cacheWillUpdate({ response: a }) {
    return a.redirected ? await B(a) : a;
  }
};
class Z {
  /**
   * Create a new PrecacheController.
   *
   * @param {Object} [options]
   * @param {string} [options.cacheName] The cache to use for precaching.
   * @param {string} [options.plugins] Plugins to use when precaching as well
   * as responding to fetch events for precached assets.
   * @param {boolean} [options.fallbackToNetwork=true] Whether to attempt to
   * get the response from the network if there's a precache miss.
   */
  constructor({ cacheName: e, plugins: t = [], fallbackToNetwork: s = !0 } = {}) {
    this._urlsToCacheKeys = /* @__PURE__ */ new Map(), this._urlsToCacheModes = /* @__PURE__ */ new Map(), this._cacheKeysToIntegrities = /* @__PURE__ */ new Map(), this._strategy = new d({
      cacheName: b.getPrecacheName(e),
      plugins: [
        ...t,
        new j({ precacheController: this })
      ],
      fallbackToNetwork: s
    }), this.install = this.install.bind(this), this.activate = this.activate.bind(this);
  }
  /**
   * @type {workbox-precaching.PrecacheStrategy} The strategy created by this controller and
   * used to cache assets and respond to fetch events.
   */
  get strategy() {
    return this._strategy;
  }
  /**
   * Adds items to the precache list, removing any duplicates and
   * stores the files in the
   * {@link workbox-core.cacheNames|"precache cache"} when the service
   * worker installs.
   *
   * This method can be called multiple times.
   *
   * @param {Array<Object|string>} [entries=[]] Array of entries to precache.
   */
  precache(e) {
    this.addToCacheList(e), this._installAndActiveListenersAdded || (self.addEventListener("install", this.install), self.addEventListener("activate", this.activate), this._installAndActiveListenersAdded = !0);
  }
  /**
   * This method will add items to the precache list, removing duplicates
   * and ensuring the information is valid.
   *
   * @param {Array<workbox-precaching.PrecacheController.PrecacheEntry|string>} entries
   *     Array of entries to precache.
   */
  addToCacheList(e) {
    const t = [];
    for (const s of e) {
      typeof s == "string" ? t.push(s) : s && s.revision === void 0 && t.push(s.url);
      const { cacheKey: n, url: c } = H(s), i = typeof s != "string" && s.revision ? "reload" : "default";
      if (this._urlsToCacheKeys.has(c) && this._urlsToCacheKeys.get(c) !== n)
        throw new l("add-to-cache-list-conflicting-entries", {
          firstEntry: this._urlsToCacheKeys.get(c),
          secondEntry: n
        });
      if (typeof s != "string" && s.integrity) {
        if (this._cacheKeysToIntegrities.has(n) && this._cacheKeysToIntegrities.get(n) !== s.integrity)
          throw new l("add-to-cache-list-conflicting-integrities", {
            url: c
          });
        this._cacheKeysToIntegrities.set(n, s.integrity);
      }
      if (this._urlsToCacheKeys.set(c, n), this._urlsToCacheModes.set(c, i), t.length > 0) {
        const r = `Workbox is precaching URLs without revision info: ${t.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`;
        console.warn(r);
      }
    }
  }
  /**
   * Precaches new and updated assets. Call this method from the service worker
   * install event.
   *
   * Note: this method calls `event.waitUntil()` for you, so you do not need
   * to call it yourself in your event handlers.
   *
   * @param {ExtendableEvent} event
   * @return {Promise<workbox-precaching.InstallResult>}
   */
  install(e) {
    return K(e, async () => {
      const t = new F();
      this.strategy.plugins.push(t);
      for (const [c, i] of this._urlsToCacheKeys) {
        const r = this._cacheKeysToIntegrities.get(i), o = this._urlsToCacheModes.get(c), h = new Request(c, {
          integrity: r,
          cache: o,
          credentials: "same-origin"
        });
        await Promise.all(this.strategy.handleAll({
          params: { cacheKey: i },
          request: h,
          event: e
        }));
      }
      const { updatedURLs: s, notUpdatedURLs: n } = t;
      return { updatedURLs: s, notUpdatedURLs: n };
    });
  }
  /**
   * Deletes assets that are no longer present in the current precache manifest.
   * Call this method from the service worker activate event.
   *
   * Note: this method calls `event.waitUntil()` for you, so you do not need
   * to call it yourself in your event handlers.
   *
   * @param {ExtendableEvent} event
   * @return {Promise<workbox-precaching.CleanupResult>}
   */
  activate(e) {
    return K(e, async () => {
      const t = await self.caches.open(this.strategy.cacheName), s = await t.keys(), n = new Set(this._urlsToCacheKeys.values()), c = [];
      for (const i of s)
        n.has(i.url) || (await t.delete(i), c.push(i.url));
      return { deletedURLs: c };
    });
  }
  /**
   * Returns a mapping of a precached URL to the corresponding cache key, taking
   * into account the revision information for the URL.
   *
   * @return {Map<string, string>} A URL to cache key mapping.
   */
  getURLsToCacheKeys() {
    return this._urlsToCacheKeys;
  }
  /**
   * Returns a list of all the URLs that have been precached by the current
   * service worker.
   *
   * @return {Array<string>} The precached URLs.
   */
  getCachedURLs() {
    return [...this._urlsToCacheKeys.keys()];
  }
  /**
   * Returns the cache key used for storing a given URL. If that URL is
   * unversioned, like `/index.html', then the cache key will be the original
   * URL with a search parameter appended to it.
   *
   * @param {string} url A URL whose cache key you want to look up.
   * @return {string} The versioned URL that corresponds to a cache key
   * for the original URL, or undefined if that URL isn't precached.
   */
  getCacheKeyForURL(e) {
    const t = new URL(e, location.href);
    return this._urlsToCacheKeys.get(t.href);
  }
  /**
   * @param {string} url A cache key whose SRI you want to look up.
   * @return {string} The subresource integrity associated with the cache key,
   * or undefined if it's not set.
   */
  getIntegrityForCacheKey(e) {
    return this._cacheKeysToIntegrities.get(e);
  }
  /**
   * This acts as a drop-in replacement for
   * [`cache.match()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match)
   * with the following differences:
   *
   * - It knows what the name of the precache is, and only checks in that cache.
   * - It allows you to pass in an "original" URL without versioning parameters,
   * and it will automatically look up the correct cache key for the currently
   * active revision of that URL.
   *
   * E.g., `matchPrecache('index.html')` will find the correct precached
   * response for the currently active service worker, even if the actual cache
   * key is `'/index.html?__WB_REVISION__=1234abcd'`.
   *
   * @param {string|Request} request The key (without revisioning parameters)
   * to look up in the precache.
   * @return {Promise<Response|undefined>}
   */
  async matchPrecache(e) {
    const t = e instanceof Request ? e.url : e, s = this.getCacheKeyForURL(t);
    if (s)
      return (await self.caches.open(this.strategy.cacheName)).match(s);
  }
  /**
   * Returns a function that looks up `url` in the precache (taking into
   * account revision information), and returns the corresponding `Response`.
   *
   * @param {string} url The precached URL which will be used to lookup the
   * `Response`.
   * @return {workbox-routing~handlerCallback}
   */
  createHandlerBoundToURL(e) {
    const t = this.getCacheKeyForURL(e);
    if (!t)
      throw new l("non-precached-url", { url: e });
    return (s) => (s.request = new Request(e), s.params = Object.assign({ cacheKey: t }, s.params), this.strategy.handle(s));
  }
}
let k;
const E = () => (k || (k = new Z()), k);
try {
  self["workbox:routing:7.2.0"] && _();
} catch {
}
const x = "GET", R = (a) => a && typeof a == "object" ? a : { handle: a };
class w {
  /**
   * Constructor for Route class.
   *
   * @param {workbox-routing~matchCallback} match
   * A callback function that determines whether the route matches a given
   * `fetch` event by returning a non-falsy value.
   * @param {workbox-routing~handlerCallback} handler A callback
   * function that returns a Promise resolving to a Response.
   * @param {string} [method='GET'] The HTTP method to match the Route
   * against.
   */
  constructor(e, t, s = x) {
    this.handler = R(t), this.match = e, this.method = s;
  }
  /**
   *
   * @param {workbox-routing-handlerCallback} handler A callback
   * function that returns a Promise resolving to a Response
   */
  setCatchHandler(e) {
    this.catchHandler = R(e);
  }
}
class ee extends w {
  /**
   * If the regular expression contains
   * [capture groups]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#grouping-back-references},
   * the captured values will be passed to the
   * {@link workbox-routing~handlerCallback} `params`
   * argument.
   *
   * @param {RegExp} regExp The regular expression to match against URLs.
   * @param {workbox-routing~handlerCallback} handler A callback
   * function that returns a Promise resulting in a Response.
   * @param {string} [method='GET'] The HTTP method to match the Route
   * against.
   */
  constructor(e, t, s) {
    const n = ({ url: c }) => {
      const i = e.exec(c.href);
      if (i && !(c.origin !== location.origin && i.index !== 0))
        return i.slice(1);
    };
    super(n, t, s);
  }
}
class te {
  /**
   * Initializes a new Router.
   */
  constructor() {
    this._routes = /* @__PURE__ */ new Map(), this._defaultHandlerMap = /* @__PURE__ */ new Map();
  }
  /**
   * @return {Map<string, Array<workbox-routing.Route>>} routes A `Map` of HTTP
   * method name ('GET', etc.) to an array of all the corresponding `Route`
   * instances that are registered.
   */
  get routes() {
    return this._routes;
  }
  /**
   * Adds a fetch event listener to respond to events when a route matches
   * the event's request.
   */
  addFetchListener() {
    self.addEventListener("fetch", (e) => {
      const { request: t } = e, s = this.handleRequest({ request: t, event: e });
      s && e.respondWith(s);
    });
  }
  /**
   * Adds a message event listener for URLs to cache from the window.
   * This is useful to cache resources loaded on the page prior to when the
   * service worker started controlling it.
   *
   * The format of the message data sent from the window should be as follows.
   * Where the `urlsToCache` array may consist of URL strings or an array of
   * URL string + `requestInit` object (the same as you'd pass to `fetch()`).
   *
   * ```
   * {
   *   type: 'CACHE_URLS',
   *   payload: {
   *     urlsToCache: [
   *       './script1.js',
   *       './script2.js',
   *       ['./script3.js', {mode: 'no-cors'}],
   *     ],
   *   },
   * }
   * ```
   */
  addCacheListener() {
    self.addEventListener("message", (e) => {
      if (e.data && e.data.type === "CACHE_URLS") {
        const { payload: t } = e.data, s = Promise.all(t.urlsToCache.map((n) => {
          typeof n == "string" && (n = [n]);
          const c = new Request(...n);
          return this.handleRequest({ request: c, event: e });
        }));
        e.waitUntil(s), e.ports && e.ports[0] && s.then(() => e.ports[0].postMessage(!0));
      }
    });
  }
  /**
   * Apply the routing rules to a FetchEvent object to get a Response from an
   * appropriate Route's handler.
   *
   * @param {Object} options
   * @param {Request} options.request The request to handle.
   * @param {ExtendableEvent} options.event The event that triggered the
   *     request.
   * @return {Promise<Response>|undefined} A promise is returned if a
   *     registered route can handle the request. If there is no matching
   *     route and there's no `defaultHandler`, `undefined` is returned.
   */
  handleRequest({ request: e, event: t }) {
    const s = new URL(e.url, location.href);
    if (!s.protocol.startsWith("http"))
      return;
    const n = s.origin === location.origin, { params: c, route: i } = this.findMatchingRoute({
      event: t,
      request: e,
      sameOrigin: n,
      url: s
    });
    let r = i && i.handler;
    const o = e.method;
    if (!r && this._defaultHandlerMap.has(o) && (r = this._defaultHandlerMap.get(o)), !r)
      return;
    let h;
    try {
      h = r.handle({ url: s, request: e, event: t, params: c });
    } catch (u) {
      h = Promise.reject(u);
    }
    const p = i && i.catchHandler;
    return h instanceof Promise && (this._catchHandler || p) && (h = h.catch(async (u) => {
      if (p)
        try {
          return await p.handle({ url: s, request: e, event: t, params: c });
        } catch (v) {
          v instanceof Error && (u = v);
        }
      if (this._catchHandler)
        return this._catchHandler.handle({ url: s, request: e, event: t });
      throw u;
    })), h;
  }
  /**
   * Checks a request and URL (and optionally an event) against the list of
   * registered routes, and if there's a match, returns the corresponding
   * route along with any params generated by the match.
   *
   * @param {Object} options
   * @param {URL} options.url
   * @param {boolean} options.sameOrigin The result of comparing `url.origin`
   *     against the current origin.
   * @param {Request} options.request The request to match.
   * @param {Event} options.event The corresponding event.
   * @return {Object} An object with `route` and `params` properties.
   *     They are populated if a matching route was found or `undefined`
   *     otherwise.
   */
  findMatchingRoute({ url: e, sameOrigin: t, request: s, event: n }) {
    const c = this._routes.get(s.method) || [];
    for (const i of c) {
      let r;
      const o = i.match({ url: e, sameOrigin: t, request: s, event: n });
      if (o)
        return r = o, (Array.isArray(r) && r.length === 0 || o.constructor === Object && // eslint-disable-line
        Object.keys(o).length === 0 || typeof o == "boolean") && (r = void 0), { route: i, params: r };
    }
    return {};
  }
  /**
   * Define a default `handler` that's called when no routes explicitly
   * match the incoming request.
   *
   * Each HTTP method ('GET', 'POST', etc.) gets its own default handler.
   *
   * Without a default handler, unmatched requests will go against the
   * network as if there were no service worker present.
   *
   * @param {workbox-routing~handlerCallback} handler A callback
   * function that returns a Promise resulting in a Response.
   * @param {string} [method='GET'] The HTTP method to associate with this
   * default handler. Each method has its own default.
   */
  setDefaultHandler(e, t = x) {
    this._defaultHandlerMap.set(t, R(e));
  }
  /**
   * If a Route throws an error while handling a request, this `handler`
   * will be called and given a chance to provide a response.
   *
   * @param {workbox-routing~handlerCallback} handler A callback
   * function that returns a Promise resulting in a Response.
   */
  setCatchHandler(e) {
    this._catchHandler = R(e);
  }
  /**
   * Registers a route with the router.
   *
   * @param {workbox-routing.Route} route The route to register.
   */
  registerRoute(e) {
    this._routes.has(e.method) || this._routes.set(e.method, []), this._routes.get(e.method).push(e);
  }
  /**
   * Unregisters a route with the router.
   *
   * @param {workbox-routing.Route} route The route to unregister.
   */
  unregisterRoute(e) {
    if (!this._routes.has(e.method))
      throw new l("unregister-route-but-not-found-with-method", {
        method: e.method
      });
    const t = this._routes.get(e.method).indexOf(e);
    if (t > -1)
      this._routes.get(e.method).splice(t, 1);
    else
      throw new l("unregister-route-route-not-registered");
  }
}
let y;
const se = () => (y || (y = new te(), y.addFetchListener(), y.addCacheListener()), y);
function I(a, e, t) {
  let s;
  if (typeof a == "string") {
    const c = new URL(a, location.href), i = ({ url: r }) => r.href === c.href;
    s = new w(i, e, t);
  } else if (a instanceof RegExp)
    s = new ee(a, e, t);
  else if (typeof a == "function")
    s = new w(a, e, t);
  else if (a instanceof w)
    s = a;
  else
    throw new l("unsupported-route-type", {
      moduleName: "workbox-routing",
      funcName: "registerRoute",
      paramName: "capture"
    });
  return se().registerRoute(s), s;
}
function ae(a, e = []) {
  for (const t of [...a.searchParams.keys()])
    e.some((s) => s.test(t)) && a.searchParams.delete(t);
  return a;
}
function* ne(a, { ignoreURLParametersMatching: e = [/^utm_/, /^fbclid$/], directoryIndex: t = "index.html", cleanURLs: s = !0, urlManipulation: n } = {}) {
  const c = new URL(a, location.href);
  c.hash = "", yield c.href;
  const i = ae(c, e);
  if (yield i.href, t && i.pathname.endsWith("/")) {
    const r = new URL(i.href);
    r.pathname += t, yield r.href;
  }
  if (s) {
    const r = new URL(i.href);
    r.pathname += ".html", yield r.href;
  }
  if (n) {
    const r = n({ url: c });
    for (const o of r)
      yield o.href;
  }
}
class ce extends w {
  /**
   * @param {PrecacheController} precacheController A `PrecacheController`
   * instance used to both match requests and respond to fetch events.
   * @param {Object} [options] Options to control how requests are matched
   * against the list of precached URLs.
   * @param {string} [options.directoryIndex=index.html] The `directoryIndex` will
   * check cache entries for a URLs ending with '/' to see if there is a hit when
   * appending the `directoryIndex` value.
   * @param {Array<RegExp>} [options.ignoreURLParametersMatching=[/^utm_/, /^fbclid$/]] An
   * array of regex's to remove search params when looking for a cache match.
   * @param {boolean} [options.cleanURLs=true] The `cleanURLs` option will
   * check the cache for the URL with a `.html` added to the end of the end.
   * @param {workbox-precaching~urlManipulation} [options.urlManipulation]
   * This is a function that should take a URL and return an array of
   * alternative URLs that should be checked for precache matches.
   */
  constructor(e, t) {
    const s = ({ request: n }) => {
      const c = e.getURLsToCacheKeys();
      for (const i of ne(n.url, t)) {
        const r = c.get(i);
        if (r) {
          const o = e.getIntegrityForCacheKey(r);
          return { cacheKey: r, integrity: o };
        }
      }
    };
    super(s, e.strategy);
  }
}
function ie(a) {
  const e = E(), t = new ce(e, a);
  I(t);
}
const re = "-precache-", oe = async (a, e = re) => {
  const s = (await self.caches.keys()).filter((n) => n.includes(e) && n.includes(self.registration.scope) && n !== a);
  return await Promise.all(s.map((n) => self.caches.delete(n))), s;
};
function le() {
  self.addEventListener("activate", (a) => {
    const e = b.getPrecacheName();
    a.waitUntil(oe(e).then((t) => {
    }));
  });
}
function he(a) {
  E().precache(a);
}
function ue(a, e) {
  he(a), ie(e);
}
const fe = "recipe-book-v2.0", C = "static-v2.0", P = "dynamic-v2.0", O = "api-v2.0", A = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/offline.html"
];
ue([{"revision":null,"url":"assets/index-Cborcdga.css"},{"revision":null,"url":"assets/js/AdvancedDashboard.tsx-l2dfhMM2.js"},{"revision":null,"url":"assets/js/ConfirmModal-C6Dovr6d.js"},{"revision":null,"url":"assets/js/Help.jsx-Bed30-ZV.js"},{"revision":null,"url":"assets/js/HomePage.tsx-C3SIVKmi.js"},{"revision":null,"url":"assets/js/icons-aFG3fnPY.js"},{"revision":null,"url":"assets/js/index-P16KQYly.js"},{"revision":null,"url":"assets/js/react-vendor-ClheY0Qu.js"},{"revision":null,"url":"assets/js/recipeEditing-BeP432ge.js"},{"revision":null,"url":"assets/js/RecipeEditor.jsx-BLg4qlbL.js"},{"revision":null,"url":"assets/js/RecipeListPage.tsx-B1Cct63n.js"},{"revision":null,"url":"assets/js/RecipeView.jsx-CxsTj6JO.js"},{"revision":null,"url":"assets/js/SettingsPage.tsx-DyNUfh60.js"},{"revision":null,"url":"assets/js/state-i18n-DHGWZsws.js"},{"revision":null,"url":"assets/js/vendor-CoKanYz2.js"},{"revision":"8de2daae66717bef278860c40f50eec3","url":"index.html"},{"revision":"811522855b142e738abdd2ef285e2bab","url":"offline.html"},{"revision":"1872c500de691dce40960bb85481de07","url":"registerSW.js"},{"revision":"6490b2c635bbf985325480d4bc7ed190","url":"favicon.ico"},{"revision":"822207078da3cd4b7e6c4c5bd8a88369","url":"icon.svg"},{"revision":"ee5d7ca522117f94cc671836ee18b938","url":"manifest.webmanifest"}]);
le();
self.addEventListener("install", (a) => {
  a.waitUntil(
    caches.open(C).then((e) => e.addAll(A)).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (a) => {
  a.waitUntil(
    caches.keys().then((e) => Promise.all(
      e.filter((t) => /^(recipe-book|static|dynamic|api)-v/.test(t) && ![fe, C, P, O].includes(t)).map((t) => caches.delete(t))
    )).then(() => self.clients.claim())
  );
});
I(({ url: a }) => a.origin === self.location.origin, ({ request: a, url: e }) => e.pathname.startsWith("/api/") ? N(a, O) : A.includes(e.pathname) || a.destination === "script" || a.destination === "style" ? L(a, C) : a.destination === "image" ? L(a, P) : N(a, P));
async function L(a, e) {
  const t = await caches.open(e), s = await t.match(a);
  if (s) return s;
  try {
    const n = await fetch(a);
    return n.ok && t.put(a, n.clone()), n;
  } catch (n) {
    if (a.destination === "document")
      return caches.match("/offline.html");
    throw n;
  }
}
async function N(a, e) {
  const t = await caches.open(e);
  try {
    const s = await fetch(a);
    return s.ok && t.put(a, s.clone()), s;
  } catch (s) {
    const n = await t.match(a);
    if (n) return n;
    if (a.destination === "document")
      return caches.match("/offline.html");
    throw s;
  }
}
self.addEventListener("sync", (a) => {
  a.tag === "sync-recipes" && a.waitUntil(de());
});
async function de() {
  try {
    const a = await caches.open("recipe-data"), e = await a.keys();
    await Promise.all(e.map(async (t) => {
      const s = await a.match(t);
      if (s) {
        const n = await s.json();
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(n)
        });
      }
    }));
  } catch {
  }
}
self.addEventListener("push", (a) => {
  const e = {
    body: a.data ? a.data.text() : "새로운 레시피가 추가되었습니다!",
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [200, 100, 200]
  };
  a.waitUntil(self.registration.showNotification("레시피북", e));
});
self.addEventListener("notificationclick", (a) => {
  a.notification.close();
  const e = a.action === "explore" ? "/recipes" : "/";
  a.waitUntil(self.clients.openWindow(e));
});
self.addEventListener("message", (a) => {
  var e;
  ((e = a.data) == null ? void 0 : e.type) === "SKIP_WAITING" && self.skipWaiting();
});
