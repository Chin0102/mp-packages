import { login as platformLogin, requestData } from '@chin0102/mp-adapter';

export class AuthError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AuthError';
    this.cause = options.cause;
  }
}

export function createAuth(options = {}) {
  const { login: loginConfig, authenticate, refresh, onSessionChange } = options;
  const customAuthenticate = typeof authenticate === 'function';
  const configuredLogin = loginConfig !== undefined;

  if (customAuthenticate === configuredLogin) {
    throw new TypeError('Provide exactly one of login or authenticate');
  }
  if (configuredLogin && (!loginConfig || typeof loginConfig !== 'object')) {
    throw new TypeError('login must be an object');
  }
  if (configuredLogin && (typeof loginConfig.url !== 'string' || !loginConfig.url)) {
    throw new TypeError('login.url must be a non-empty string');
  }
  if (authenticate !== undefined && !customAuthenticate) {
    throw new TypeError('authenticate must be a function');
  }
  if (refresh !== undefined && typeof refresh !== 'function' && (!refresh || typeof refresh !== 'object')) {
    throw new TypeError('refresh must be a function or an object');
  }
  if (refresh && typeof refresh === 'object' && (typeof refresh.url !== 'string' || !refresh.url)) {
    throw new TypeError('refresh.url must be a non-empty string');
  }
  if (onSessionChange !== undefined && typeof onSessionChange !== 'function') {
    throw new TypeError('onSessionChange must be a function');
  }

  let session = options.initialSession ?? null;
  let version = 0;
  let pending = null;
  const listeners = new Set();

  const requestSession = async (config, input) => {
    const { data, transform, transport, ...requestOptions } = config;
    const requestDataValue = typeof data === 'function' ? await data(input) : data;
    const response = await requestData(
      {
        method: 'POST',
        ...requestOptions,
        data: requestDataValue,
      },
      transport,
    );
    return typeof transform === 'function' ? transform(response, input) : response;
  };

  const performLogin = customAuthenticate
    ? authenticate
    : async (context) => {
        const { platform: platformOptions, data, ...requestConfig } = loginConfig;
        const loginResult = await platformLogin(platformOptions);
        if (!loginResult?.code) {
          throw new AuthError('Platform login did not return a code');
        }
        const input = { code: loginResult.code, loginResult, context };
        return requestSession(
          {
            ...requestConfig,
            data:
              typeof data === 'function'
                ? data
                : { ...(data || {}), code: loginResult.code },
          },
          input,
        );
      };

  const performRefresh = (current, context) => {
    if (typeof refresh === 'function') return refresh(current, context);
    if (refresh) return requestSession(refresh, { session: current, context });
    return performLogin(context);
  };

  const updateSession = (nextSession) => {
    if (nextSession == null) throw new AuthError('Authentication returned an empty session');
    const previous = session;
    session = nextSession;
    version += 1;
    onSessionChange?.(session, previous);
    listeners.forEach((listener) => listener(session, previous));
    return session;
  };

  const clear = () => {
    version += 1;
    if (session === null) return;
    const previous = session;
    session = null;
    onSessionChange?.(null, previous);
    listeners.forEach((listener) => listener(null, previous));
  };

  const run = (operation) => {
    if (pending) return pending;
    const operationVersion = version;

    pending = Promise.resolve()
      .then(operation)
      .then((nextSession) => {
        if (operationVersion !== version) {
          throw new AuthError('Authentication result is stale');
        }
        return updateSession(nextSession);
      })
      .catch((error) => {
        throw error instanceof AuthError
          ? error
          : new AuthError('Authentication failed', { cause: error });
      })
      .finally(() => {
        pending = null;
      });

    return pending;
  };

  const login = (context = {}, config = {}) => {
    if (session !== null && !config.force) return Promise.resolve(session);
    return run(() => performLogin(context));
  };

  const renew = (context = {}) => {
    const current = session;
    return run(() => (current === null ? performLogin(context) : performRefresh(current, context)));
  };

  const renewIfCurrent = (expectedVersion, context = {}) => {
    if (expectedVersion !== version && session !== null) return Promise.resolve(session);
    return renew(context);
  };

  return {
    login,
    renew,
    renewIfCurrent,
    logout: clear,

    getSession() {
      return session;
    },

    getVersion() {
      return version;
    },

    isAuthenticated() {
      return session !== null;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
