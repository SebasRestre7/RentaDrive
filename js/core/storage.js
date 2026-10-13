const PREFIX = 'rentadrive';

function getStorage(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function createStore(scope, kind = 'local') {
  if (!scope || !/^[a-z0-9-]+$/i.test(scope)) {
    throw new TypeError('A simple storage scope is required.');
  }

  const storage = getStorage(kind);
  const keyFor = (key) => `${PREFIX}:${scope}:${key}`;

  return {
    get(key, fallback = null) {
      if (!storage) return fallback;
      try {
        const value = storage.getItem(keyFor(key));
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      if (!storage) return false;
      try {
        storage.setItem(keyFor(key), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      if (!storage) return false;
      try {
        storage.removeItem(keyFor(key));
        return true;
      } catch {
        return false;
      }
    },
  };
}
