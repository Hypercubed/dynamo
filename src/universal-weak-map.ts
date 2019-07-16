export class UniversalWeakMap<T> {
  private _weakMap = new WeakMap<object, T>();
  private _strongMap = new Map<any, T>();

  get(key: unknown) {
    return isObjRef(key) ? this._weakMap.get(key) : this._strongMap.get(key);
  }

  has(key: unknown) {
    return isObjRef(key) ? this._weakMap.has(key) : this._strongMap.has(key);
  }

  set(key: unknown, value: any) {
    isObjRef(key) ? this._weakMap.set(key, value) : this._strongMap.set(key, value);
    return value;
  }
}

function isObjRef(value: unknown): value is object {
  switch (typeof value) {
  case 'object':
    if (value === null) {
      return false;
    }
  case 'function':
    return true;
  default:
    return false;
  }
}
