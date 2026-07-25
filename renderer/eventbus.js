class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) set.delete(callback);
  }

  once(event, callback) {
    if (typeof callback !== 'function') return () => {};
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }

  emit(event, data) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const cb of [...set]) {
      cb(data);
    }
  }

  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventBus };
}
