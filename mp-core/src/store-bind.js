const UnsubscribersKey = '__storeUnsubscribers';

export function bindStore(page, store, selector, dataKey) {
  if (!page || typeof page.setData !== 'function') {
    throw new TypeError('A page or component instance with setData() is required');
  }
  if (!dataKey) throw new Error('dataKey is required');

  const select = typeof selector === 'function' ? selector : (state) => state;
  const unsubscribe = store.subscribe((state) => {
    page.setData({ [dataKey]: select(state) });
  });

  if (!page[UnsubscribersKey]) page[UnsubscribersKey] = [];
  page[UnsubscribersKey].push(unsubscribe);
  return unsubscribe;
}

export function unbindStores(page) {
  const unsubscribers = page?.[UnsubscribersKey];
  if (!unsubscribers) return;

  unsubscribers.forEach((unsubscribe) => unsubscribe());
  page[UnsubscribersKey] = [];
}
