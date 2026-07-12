import { HttpError, requestData, uploadFile } from '@chin0102/mp-adapter';

export class ApiError extends Error {
  constructor(message, code, data) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

const defaultUnauthorized = (error) => error instanceof HttpError && error.statusCode === 401;
const identity = (value) => value;

const joinURL = (baseURL, path) => {
  if (!baseURL || /^https?:\/\//i.test(path)) return path;
  return `${baseURL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

export function createApiClient(options = {}) {
  const {
    baseURL = '',
    auth,
    getAccessToken = (session) => session?.accessToken,
    isUnauthorized = defaultUnauthorized,
    transformResponse = identity,
  } = options;

  if (!auth || typeof auth.login !== 'function' || typeof auth.renewIfCurrent !== 'function') {
    throw new TypeError('auth must be created by createAuth');
  }
  if (typeof getAccessToken !== 'function') throw new TypeError('getAccessToken must be a function');
  if (typeof isUnauthorized !== 'function') throw new TypeError('isUnauthorized must be a function');
  if (typeof transformResponse !== 'function') throw new TypeError('transformResponse must be a function');

  const buildOptions = (path, requestOptions, session) => {
    const token = session === null ? undefined : getAccessToken(session);
    return {
      ...requestOptions,
      url: joinURL(baseURL, path),
      header: {
        ...requestOptions.header,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  };

  const execute = async (transport, path, requestOptions = {}, config = {}) => {
    const needAuth = config.auth !== false;
    const retryAuth = config.retryAuth !== false;
    let session = needAuth ? await auth.login(config.authContext) : null;
    let sessionVersion = auth.getVersion();

    const send = () =>
      transport(buildOptions(path, requestOptions, session), config.transport).then((data) =>
        transformResponse(data, { path, requestOptions }),
      );

    try {
      return await send();
    } catch (error) {
      if (!needAuth || !retryAuth || !isUnauthorized(error)) throw error;
      session = await auth.renewIfCurrent(sessionVersion, config.authContext);
      sessionVersion = auth.getVersion();
      return send();
    }
  };

  const request = (path, requestOptions, config) => execute(requestData, path, requestOptions, config);

  return {
    request,

    upload(path, uploadOptions, config) {
      return execute(uploadFile, path, uploadOptions, config);
    },

    get(path, data, config) {
      return request(path, { method: 'GET', data }, config);
    },

    post(path, data, config) {
      return request(path, { method: 'POST', data }, config);
    },

    put(path, data, config) {
      return request(path, { method: 'PUT', data }, config);
    },

    patch(path, data, config) {
      return request(path, { method: 'PATCH', data }, config);
    },

    delete(path, data, config) {
      return request(path, { method: 'DELETE', data }, config);
    },
  };
}
