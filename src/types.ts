export class Any {
  static isAny(x: unknown): x is unknown {
    return true;
  }
}

export class Null {
  static isNull(x: unknown): x is null {
    return x === null;
  }
}

export class Undefined {
  static isUndefined(x: undefined): x is null {
    return typeof x === 'undefined';
  }
}

/**
 * converts undefined and null to Undefined and Null
 */
export function fixType(x: Type): Type {
  if (arguments.length === 0) return;
  if (x === null) return Null;
  if (typeof x === 'undefined') return Undefined;
  return x;
}
