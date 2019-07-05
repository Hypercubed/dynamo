/// <reference path="./types.d.ts" />

import 'reflect-metadata';
import {
  guard,
  META_METHODS, META_GUARDS,
  SignatureData, GuardData
} from './decorators';
import { 
  Number as NumberType, Boolean as BooleanType, String as StringType,
  Null, Array as ArrayType, Function as FunctionType,
  Runtype, match, Tuple, Union, Guard, InstanceOf, Literal, Unknown
} from 'runtypes';

declare module 'runtypes' {
  // tslint:disable-next-line:no-empty-interface
  interface Runtype<A> extends ObjectConstructor {}
}

export * from 'runtypes';

class DefaultTypes {
  @guard(Number)
  static isNumber = NumberType;

  @guard(String)
  static isString = StringType;

  @guard(Boolean)
  static isBoolean = BooleanType;

  @guard(Function)
  static isFunction = FunctionType;

  @guard(Array)
  static isArray = Array.isArray;

  @guard(Date)
  static isDate = InstanceOf(Date);

  @guard(RegExp)
  static isRegExp = InstanceOf(Date);

  @guard(null)
  static isNull = Null;

  @guard(undefined)
  static isUndefined = Literal(undefined);

  @guard(Object)
  static isObject = Guard((x: any): x is object => {
    return typeof x === 'object' && x !== null && x.constructor === Object;
  });

  @guard(Unknown)
  static isAny = Unknown;
}

interface TypedOptions {
  typed?: any;
}

export class Typed {
  private guards = new WeakMap<Type, Runtype>();

  constructor(private options: TypedOptions = {}) {
    this._addTypes(DefaultTypes);
  }

  add(...ctors: Array<Constructor<unknown>>) {
    ctors.forEach(c => {
      this._addTypes(c);
      // this._addConversions(c);      
    });

    return this;
  }

  function<T extends Constructor<any>>(ctor: T): FunctionProperties<InstanceType<T>> {
    const target = new ctor();
    const name = 'name' in target ? target.name : ctor.name;

    const arr = Reflect.getMetadata(META_METHODS, target);

    if (!arr || arr.length < 0) {
      throw new Error('No signatures provided');
    }

    let maxLength = 0;
    const sequence = arr.map(({ key, types }: SignatureData) => {
      maxLength = Math.max(maxLength, types.length);
      const g = this._getSignatureGuard(types);
      return [g, () => target[key]];
    });

    const m = match.apply(null, sequence);
    const fn = function(...args: unknown[]) {
      const f = m(args);
      return f.apply(this, args);
    };

    Object.defineProperty(fn, 'name', { value: name });
    Object.defineProperty(fn, 'length', { value: maxLength });
    return fn as any;
  }

  /**
   * Given an array type token, returns the tuple
   */
  private _getSignatureGuard(types: Array<Type | Type[]>): Runtype {
    const length = types.length;
    const lengthGuard = Guard((x: any[]): x is any => x.length === length);
    const runtypes = types.map(t => this._getRuntype(t));

    if (length < 2) {
      return lengthGuard.And(ArrayType(runtypes[0]));
    }
    return lengthGuard.And((Tuple as any)(...runtypes));
  }

  /**
   * Given a type token, returns the runtype
   * Arrays are converted to intersections
   * 
   */
  private _getRuntype(type: Type | Type[]): Runtype {
    if (Array.isArray(type)) {
      const runtypes = type.map(t => this._getRuntype(t));
      return Union.apply(null, runtypes);
    }

    if (type === null) {
      return Null;
    }

    if (!this.guards.has(type)) {
      throw new TypeError(`Unknown type "${getName(type)}"`);
    }

    return this.guards.get(type);
  }

  private _addTypes(ctor: Constructor<unknown>) {
    const guards = Reflect.getMetadata(META_GUARDS, ctor) || [];
    guards.forEach(({ key, type }: GuardData) => {
      const method = ctor[key];
      const _guard = typeof method === 'object' ? method : Guard(method);
      this.guards.set(type, _guard);
    });
  }

  /* private _addConversions(ctor: Constructor) {
    const arr = Reflect.getMetadata(META_CONVERSIONS, ctor) || [];
    arr.forEach(({ key, parameterTypes, returnType }: ConversionData) => {
      this._typed.addConversion({
        from: parameterTypes,
        to: returnType,
        convert: ctor[key]
      });
    });
  } */
}

export const typed = new Typed();

function getName(token: Type | Type[]): string {
  if (Array.isArray(token)) {
    return token.map(getName).join(' | ');
  }
  if (token === null || typeof token === 'undefined') {
    return String(token);
  }

  return ('name' in token && typeof token.name === 'string') ? token.name : 'unknown';
}
