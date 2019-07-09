/// <reference path="./types.d.ts" />
import 'reflect-metadata';
import {
  guard,
  META_METHODS, META_GUARDS, META_CONVERSIONS,
  SignatureMap, GuardMap, ConversionMap, Parameter
} from './decorators';
import { union, tuple, matcher, choose, intersect, mapper, id } from './guards';
import { Any, Undefined, Null, fixType } from './types';

guard()(Any, 'isAny');
guard()(Undefined, 'isUndefined');
guard()(Null, 'isNull');

class DefaultTypes {
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

  @guard(Array)
  static isArray(x: unknown): x is any[] {
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

  @guard(Any)
  static isAny(x: unknown): x is unknown {
    return true;
  }
}

interface ConversionMethod {
  fromType: Type;
  convert: Conversion<unknown, unknown>;
}

interface TypedOptions {
  types: any;
  autoadd: boolean;
}

const defaultOptions: TypedOptions = {
  types: DefaultTypes,
  autoadd: false
};

export class Typed {
  private guards = new WeakMap<Type, Array<Guard<unknown>>>();
  private conversions = new WeakMap<Type, ConversionMethod[]>();

  constructor(private options?: Partial<TypedOptions>) {
    this.options = {
      ...defaultOptions,
      ...options
    };
    this.add(this.options.types);
  }

  add(...ctors: Type[]) {
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
        const [g, convert] = this._getSignatureGuard(signature);
        sequence.push([g, [ target[key], convert ]]);
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
    // When min = max, skip length checks?
    // optimized functions for sigs < 6, skip choose

    const [g0, [m0, c0]] = sequence[0];

    if (maxLength === 0) {
      // Special case when the function is a nullary
      // no guards or conversions possible
      // not very usefull anyway
      return function() {
        if (arguments.length > 0) {
          throw new TypeError('No alternatives were matched');
        }
        return m0.call(this);
      };
    }

    if (sequence.length === 1) {
      // Special case when there is only one method
      return function(...args: unknown[]) {
        if (g0(args)) return m0.apply(this, c0(args));
        throw new TypeError('No alternatives were matched');
      };
    }

    const [g1, [m1, c1]] = sequence[1];

    const s = choose<[ AnyFunction, AnyFunction ]>(sequence.slice(2));
    return function(...args: unknown[]) {
      if (g0(args)) return m0.apply(this, c0(args));  // opt for len = 2
      if (g1(args)) return m1.apply(this, c1(args));
      const [ m, c ] = s(args);
      return m.apply(this, c(args));
    };
  }

  /**
   * Given an array type Parameters, returns the guard and matcher function
   */
  private _getSignatureGuard(params: Parameter[]): [Guard<unknown>, Conversion<unknown[], unknown[]>] {
    const guardsAndMatchers = params.map(t => this._convertParamToUnion(t));
    const guards = guardsAndMatchers.map(x => x[0]);
    const matchers = guardsAndMatchers.map(x => x[1]);
    const _tuple = tuple(guards);
    const _convert = mapper(matchers);
    return [_tuple, _convert];
  }

  /**
   * Given a type param, returns the runtype
   * Arrays are converted to intersections
   * 
   */
  private _convertParamToUnion(types: Type[]): [Guard<unknown>, Conversion<unknown, unknown>] {
    const len = types.length;
    // @ts-ignore
    const converters: Array<Conversion<unknown, unknown>> = types.map(() => id);

    types.forEach(toType => {
      const conversions = this.conversions.get(toType) || [];
      conversions.forEach(({ fromType, convert }) => {
        if (types.indexOf(fromType) < 0) {
          types.push(fromType);
          converters.push(convert);
        }
      });
    });

    const guards = types.map(t => this._getGuard(t));
    const _union = union(guards);

    if (types.length === len) {
      // Optimization when no conversions were added
      return [_union, id];
    }

    const _match = matcher(guards, converters);
    return [_union, _match];
  }

  private _getGuard(type: Type): Guard<unknown> {
    type = fixType(type);
    if (!this.guards.has(type)) {
      if (!this.options.autoadd) {
        throw new TypeError(`Unknown type "${getName(type)}"`);
      }
      this._addTypes(type);
    }
    const guards = this.guards.get(type);
    return intersect(guards);
  }

  private _addTypes(ctor: Type) {
    const map: GuardMap = Reflect.getMetadata(META_GUARDS, ctor);

    if (!map) {
      if (this.options.autoadd && typeof ctor === 'function') {
        this.guards.set(ctor, [(x: unknown) => x instanceof ctor]);
      }
      return;
    }

    for (const key in map) {
      const type = map[key] || ctor;
      const existing = this.guards.get(type) || [];
      const method = ctor[key];
      const guards = [ ...existing, method ];
      this.guards.set(type, guards);
    }
  }

  private _addConversions(ctor: Type) {
    const map: ConversionMap = Reflect.getMetadata(META_CONVERSIONS, ctor) || {};
    for (const key in map) {
      const { fromType, toType } = map[key];
      const existing = this.conversions.get(toType) || [];

      // TODO: store guard instead of fromType to avoid a strong reference!!
      const conversion = { 
        fromType,
        convert: ctor[key]
      };
      // TODO: error if adding the same conversion
      this.conversions.set(toType, [ ...existing, conversion ]);
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
