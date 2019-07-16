import { guard } from './decorators';

export class Any {
  @guard()
  static isAny(x: unknown): x is unknown {
    return true;
  }
}

export class PrimitiveTypes {
  @guard(Number)
  static isNumber = (x: unknown): x is number => {
    return typeof x === 'number';
  }

  @guard(String)
  static isString = (x: unknown): x is string => {
    return typeof x === 'string';
  }

  @guard(Boolean)
  static isBoolean(x: unknown): x is boolean {
    return typeof x === 'boolean';
  }

  @guard(Function)
  static isFunction(x: unknown): x is AnyFunction {
    return typeof x === 'function';
  }

  @guard(null)
  static isNull(x: unknown): x is null {
    return x === null;
  }

  @guard(undefined)
  static isUndefined(x: unknown): x is undefined {
    return typeof x === 'undefined';
  }
}

export class ConstructorTypes {
  @guard(Array)
  static isArray = Array.isArray;

  @guard(Date)
  static isDate(x: unknown): x is Date {
    return x instanceof Date;
  }

  @guard(RegExp)
  static isRegExp(x: unknown): x is RegExp {
    return x instanceof RegExp;
  }

  @guard(Object)
  static isObject(x: unknown): x is object {
    return typeof x === 'object' && x !== null && x.constructor === Object;
  }
}

export const defaultTypes = [PrimitiveTypes, ConstructorTypes, Any];
