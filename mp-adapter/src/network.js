import { invoke, mapResult } from './invoke.js';

const defaultValidateStatus = (status) => status >= 200 && status < 300;
const defaultTransform = (response) => response.data;

export class HttpError extends Error {
  constructor(response) {
    super(`Request failed with status ${response.statusCode}`);
    this.name = 'HttpError';
    this.statusCode = response.statusCode;
    this.response = response;
  }
}

export function requestData(options, config = {}) {
  const validateStatus = config.validateStatus || defaultValidateStatus;
  const transform = config.transform || defaultTransform;

  return mapResult(invoke('request', options), (response) => {
    if (!validateStatus(response.statusCode, response)) {
      throw new HttpError(response);
    }
    return transform(response);
  });
}

export function uploadFile(options, config = {}) {
  const validateStatus = config.validateStatus || defaultValidateStatus;
  const transform = config.transform || defaultTransform;

  return mapResult(invoke('uploadFile', options), (response) => {
    if (!validateStatus(response.statusCode, response)) {
      throw new HttpError(response);
    }

    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {}
    }

    return transform({ ...response, data });
  });
}
