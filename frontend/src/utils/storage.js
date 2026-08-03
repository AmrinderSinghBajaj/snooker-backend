const SECRET_KEY = 'bajaj_snooker_arena_secret_salt';

function encrypt(text) {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(unescape(encodeURIComponent(result)));
}

function decrypt(encoded) {
  if (!encoded) return '';
  try {
    const text = decodeURIComponent(escape(atob(encoded)));
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    return '';
  }
}

export const secureStorage = {
  setItem(key, value) {
    localStorage.setItem(key, encrypt(value));
  },
  getItem(key) {
    const val = localStorage.getItem(key);
    return val ? decrypt(val) : null;
  },
  removeItem(key) {
    localStorage.removeItem(key);
  },
  clear() {
    localStorage.clear();
  }
};

export const secureSessionStorage = {
  setItem(key, value) {
    sessionStorage.setItem(key, encrypt(value));
  },
  getItem(key) {
    const val = sessionStorage.getItem(key);
    return val ? decrypt(val) : null;
  },
  removeItem(key) {
    sessionStorage.removeItem(key);
  },
  clear() {
    sessionStorage.clear();
  }
};
