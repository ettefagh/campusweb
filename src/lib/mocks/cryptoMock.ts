export const randomBytes = (len: number) => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint8Array(len));
  }
  throw new Error("crypto.randomBytes is not supported in this environment.");
};

export default {
  randomBytes
};
