/* ===== FORGE ENGINE — Event Bus ===== */
FORGE.Events = {
  _listeners: {},
  on(event, fn) { if (!this._listeners[event]) this._listeners[event] = []; this._listeners[event].push(fn); },
  off(event, fn) { if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter(f => f !== fn); },
  emit(event, ...args) { if (this._listeners[event]) for (const fn of this._listeners[event]) fn(...args); },
  once(event, fn) { const w = (...a) => { this.off(event, w); fn(...a); }; this.on(event, w); }
};
