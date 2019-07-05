/// <reference path="./types.d.ts" />

import 'reflect-metadata';
import {
  guard,
  META_METHODS, META_GUARDS, META_CONVERSIONS,
  SignatureMap, GuardMap, ConversionMap, Parameter
} from './decorators';
import { union, tuple, matcher, choose, Unknown } from './guardtypes';

const I = (x: unknown) => x;

class DefaultTypes {
  @guard(Number)
  static isNumber = (x: unknown): x is number => {
    return typeof x === 'number';
  }

  @guard(String)
  static isString(x: unknown): x is string {
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

  @guard(Array)
  static isArray(x: unknown): boolean {
    return Array.isArray(x);
  }

  @guard(Date)
  static isDate(x: unknown): x is Date {
    return x instanceof Date;
  }

  @guard(RegExp)
  static isRegExp(x: unknown): x is RegExp {
    return x instanceof RegExp;
  }

  @guard(null)
  static isNull(x: unknown): x is null {
    return x === null;
  }

  @guard(undefined)
  static isUndefined(x: unknown): x is undefined {
    return typeof x === 'undefined';
  }

  @guard(Object)
  static isObject(x: unknown): x is object {
    return typeof x === 'object' && x !== null && x.constructor === Object;
  }

  @guard(Unknown)
  static isUnknown(x: unknown): boolean {
    return true;
  }
}

interface TypedOptions {
  types?: Constructor<unknown>;
}

type Conversion = (x: unknown) => unknown;

interface ConversionMethod {
  fromType: Type;
  convert: Conversion;
}

export class Typed {
  private guards = new WeakMap<Type, Guard<unknown>>();
  private conversions = new WeakMap<Type, ConversionMethod[]>();

  constructor(options: TypedOptions = {}) {
    this.add(options.types || DefaultTypes);
  }

  add(...ctors: Array<Constructor<unknown>>) {
    ctors.forEach(c => {
      this._addTypes(c);
      this._addConversions(c);      
    });
    return this;
  }

  function<T extends Constructor<any>>(ctor: T): FunctionProperties<InstanceType<T>> {
    const target = new ctor();
    const name = 'name' in target ? target.name : ctor.name;

    const map: SignatureMap = Reflect.getMetadata(META_METHODS, target);

    if (!map || Object.keys(map).length < 0) {
      throw new Error('No signatures provided');
    }

    let maxLength = 0;
    let minLength = Infinity;
    const sequence: Array<[Guard<unknown>, any]> = [];

    for (const key in map) {
      const signatures = map[key];
      signatures.forEach(signature => {
        maxLength = Math.max(maxLength, signature.length);
        minLength = Math.min(minLength, signature.length);
        const [g, converters] = this._getSignatureGuard(signature);
        sequence.push([g, {
          converters,
          method: target[key]
        }]);
      });
    }

    const fn = this._makeFunction(sequence, minLength, maxLength);

    if (fn.length !== maxLength) {
      Object.defineProperty(fn, 'length', { value: maxLength });
    }

    Object.defineProperty(fn, 'name', { value: name });
    return fn as any;
  }

  private _makeFunction(sequence: Array<[Guard<unknown>, any]>, minLength: number, maxLength: number): any {
    // Todo Optimizations:
    // optimize runtype guards
    // When min = max, skip spread?
    // Detect when max length == 1, skip tuples
    // Detect when there are no conversions, skip matchers
    // optimized functions for sigs < 6, skip choose

    if (maxLength === 0) {
      // Special case when the function is a nullary
      // not very usefull anyway
      const { method } = sequence[0][1];
      return function() {
        if (arguments.length > 0) {
          throw new TypeError('No alternatives were matched');
        }
        return method.call(this);
      };
    }

    const m = choose<any>(sequence);
    return function(...args: unknown[]) {
      const { method, converters } = m(args);
      for (const i in converters) {
        if (converters[i]) {
          args[i] = converters[i](args[i]);
        }
      }
      return method.apply(this, args);
    };
  }

  /**
   * Given an array type Parameters, returns the guard and matcher function
   */
  private _getSignatureGuard(params: Parameter[]): [Guard<unknown>, AnyFunction[]] {
    const guardsAndMatchers = params.map(t => this._convertParamToUnion(t));
    const guards = guardsAndMatchers.map(x => x[0]);
    const matchers = guardsAndMatchers.map(x => x[1]);

    const hasConversions = matchers.some(Boolean);

    const _tuple = tuple(guards);

    if (hasConversions) {
      return [_tuple, matchers];
    }

    return [_tuple, []];
  }

  /**
   * Given a type param, returns the runtype
   * Arrays are converted to intersections
   * 
   */
  private _convertParamToUnion(types: Type[]): [Guard<unknown>, AnyFunction] {
    const { length } = types;
    const converters: Conversion[] = types.map(() => I);

    types.forEach(toType => {
      const conversions = this.conversions.get(toType) || [];
      conversions.forEach(({ fromType, convert }) => {
        if (types.indexOf(fromType) < 0) {
          types.push(fromType);
          converters.push(convert);
        }
      });
    });

    const noConversions = length === types.length;

    const guards = types.map(t => this._getGuard(t));

    // optmization... skip union type if there is only one type
    const _union = guards.length > 1 ? union(guards) : guards[0];

    if (noConversions) {
      return [_union, null];
    }
    
    const _match = matcher(guards, converters);
    return [_union, _match];
  }

  private _getGuard(type: Type): Guard<unknown> {
    if (type === null) {
      return DefaultTypes.isNull;
    }
    if (type === undefined) {
      return DefaultTypes.isUndefined;
    }

    if (!this.guards.has(type)) {
      throw new TypeError(`Unknown type "${getName(type)}"`);
    }
    return this.guards.get(type);
  }

  private _addTypes(ctor: Constructor<unknown>) {
    const map: GuardMap = Reflect.getMetadata(META_GUARDS, ctor) || {};
    for (const key in map) {
      const type = map[key];
      const method = ctor[key];
      // TODO: error if adding a guard for the same type
      this.guards.set(type, method);
    }
  }

  private _addConversions(ctor: Constructor<unknown>) {
    const map: ConversionMap = Reflect.getMetadata(META_CONVERSIONS, ctor) || {};
    for (const key in map) {
      const { fromType, toType } = map[key];
      const existing = this.conversions.get(toType) || [];
      const d = { 
        fromType,
        convert: ctor[key]
      };
      // TODO: error if adding the smae conversion
      this.conversions.set(toType, [ ...existing, d ]);
    }
  }
}

export const typed = new Typed();

function getName(token: Type | Type[]): string {
  if (token === null || typeof token === 'undefined') {
    return String(token);
  }
  return ('name' in token && typeof token.name === 'string') ? token.name : 'unknown';
}
