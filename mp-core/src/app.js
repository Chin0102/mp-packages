import { context, appContext } from './context.js';

const runtimeOptionKeys = ['adapter', 'plugins', 'runtime', 'systemInfo', 'tabs'];
const isThenable = (value) => value && typeof value.then === 'function';

function callPlugins(hook, app, args) {
  return context.plugins.map((plugin) => plugin[hook]?.(app, appContext, ...args));
}

function reportError(error, errorContext, handler) {
  context.plugins.forEach((plugin) => {
    try {
      plugin.onError?.(error, errorContext, appContext);
    } catch {}
  });
  try {
    handler?.(error, errorContext, appContext);
  } catch {}
}

export function defineApp(factory) {
  const appOptions = typeof factory === 'function' ? factory(appContext) : factory;
  if (!appOptions || typeof appOptions !== 'object') throw new TypeError('defineApp requires an options object or factory');

  const { setup, handleError, onLaunch, onShow, onHide, onError, onUnhandledRejection } = appOptions;
  if (setup !== undefined && typeof setup !== 'function') throw new TypeError('setup must be a function');
  if (handleError !== undefined && typeof handleError !== 'function') throw new TypeError('handleError must be a function');

  const runtimeOptions = Object.fromEntries(runtimeOptionKeys.filter((key) => appOptions[key] !== undefined).map((key) => [key, appOptions[key]]));
  context.init(runtimeOptions);

  const wrappedOptions = { ...appOptions };
  ['setup', 'handleError', ...runtimeOptionKeys].forEach((key) => delete wrappedOptions[key]);

  return Object.assign(wrappedOptions, {
    onLaunch(...args) {
      context.beginLaunch(args[0]);

      let startup;
      try {
        const pluginResults = callPlugins('onAppLaunch', this, args);
        const userResult = onLaunch?.apply(this, args);
        const beforeSetup = [...pluginResults, userResult];
        startup = beforeSetup.some(isThenable)
          ? Promise.all(beforeSetup).then(() => setup?.call(this, appContext, ...args))
          : setup?.call(this, appContext, ...args);
      } catch (error) {
        startup = Promise.reject(error);
      }

      if (!isThenable(startup)) {
        return Promise.resolve(context.completeLaunch(startup));
      }

      const tracked = Promise.resolve(startup).then(
        (services) => context.completeLaunch(services),
        (error) => {
          context.failLaunch(error);
          reportError(error, { source: 'app.launch', app: this }, handleError);
          throw error;
        },
      );
      // The host does not consume lifecycle return values, so keep the tracked
      // startup rejection from being reported as unhandled a second time.
      tracked.catch(() => {});
      return tracked;
    },

    onShow(...args) {
      try {
        callPlugins('onAppShow', this, args);
        return onShow?.apply(this, args);
      } catch (error) {
        reportError(error, { source: 'app.onShow', app: this }, handleError);
        throw error;
      }
    },

    onHide(...args) {
      try {
        callPlugins('onAppHide', this, args);
        return onHide?.apply(this, args);
      } catch (error) {
        reportError(error, { source: 'app.onHide', app: this }, handleError);
        throw error;
      }
    },

    onError(error) {
      reportError(error, { source: 'app.onError', app: this }, handleError);
      return onError?.call(this, error);
    },

    onUnhandledRejection(event) {
      reportError(event?.reason ?? event, { source: 'app.onUnhandledRejection', app: this, event }, handleError);
      return onUnhandledRejection?.call(this, event);
    },
  });
}
