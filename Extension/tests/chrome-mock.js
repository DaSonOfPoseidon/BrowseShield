// Mock chrome.* APIs for testing outside of a browser environment.

const storage = new Map();

const chromeMock = {
  storage: {
    local: {
      get: async (keys) => {
        if (typeof keys === "string") keys = [keys];
        const result = {};
        for (const key of keys) {
          if (storage.has(key)) {
            result[key] = storage.get(key);
          }
        }
        return result;
      },
      set: async (items) => {
        for (const [key, value] of Object.entries(items)) {
          storage.set(key, value);
        }
      },
      remove: async (keys) => {
        if (typeof keys === "string") keys = [keys];
        for (const key of keys) {
          storage.delete(key);
        }
      },
    },
  },
  runtime: {
    sendMessage: () => {},
    onMessage: { addListener: () => {} },
    lastError: null,
  },
  tabs: {
    query: async () => [],
    onRemoved: { addListener: () => {} },
  },
  action: {
    setBadgeBackgroundColor: () => {},
    setBadgeText: () => {},
  },
};

export function installChromeMock() {
  globalThis.chrome = chromeMock;
}

export function resetStorage() {
  storage.clear();
}

export { chromeMock };
