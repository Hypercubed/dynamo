/// <reference path="./types.d.ts" />
import 'reflect-metadata';
import {
  guard,
  META_METHODS, META_GUARDS, META_CONVERSIONS,
  SignatureMap, GuardMap, ConversionMap, Parameter
} from './decorators';
import { union, tuple, matcher, index, intersect, mapper, id } from './guards';
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
  fromName: string;
  fromGuard: Guard<unknown>;
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
    const guards: Array<Guard<unknown>> = [];
    const converters: any[] = [];
    const methods: any[] = [];
    const descriptions: string[] = [];

    for (const key in map) {
      const signatures = map[key];
      signatures.forEach(signature => {
        maxLength = Math.max(maxLength, signature.length);
        minLength = Math.min(minLength, signature.length);
        const [g, convert, description] = this._getSignatureGuard(signature);
        guards.push(g);
        converters.push(convert);
        methods.push(target[key]);
        descriptions.push(description);
      });
    }

    const fn = this._makeFunction(guards, converters, methods, descriptions, minLength, maxLength);

    if (fn.length !== maxLength) {
      Object.defineProperty(fn, 'length', { value: maxLength });
    }

    Object.defineProperty(fn, 'name', { value: name });
    return fn as any;
  }

  private _makeFunction(
    guards: Array<Guard<unknown>>,
    converters: any[],
    methods: any[],
    descriptions: string[],
    minLength: number,
    maxLength: number): any {
    // Todo Optimizations:
    // When min = max, skip length checks?
    // optimized functions for sigs < 6, skip choose
    // const len = guards.length;

    const description = descriptions.join(' or ');

    const m0 = methods[0];

    if (maxLength === 0) {
      // Special case when the function is a nullary
      // no guards or conversions possible
      // not very usefull anyway
      return function() {
        if (arguments.length > 0) {
          // throw new Error(descriptions[0]);
          throw new Error(`Expected 0 arguments, but got ${arguments.length}`);
        }
        return m0.call(this);
      };
    }

    const s = index(guards);
    return function(...args: unknown[]) {
      const i = s(args);
      if (i < 0) {
        throw new TypeError(`Unexpected type of arguments. Expected ${description}.`);
      }
      const m = methods[i];
      const c = converters[i];
      return m.apply(this, c(args));
    };
  }

  /**
   * Given an array type Parameters, returns the guard and matcher function
   */
  private _getSignatureGuard(params: Parameter[]): [Guard<unknown>, Conversion<unknown[], unknown[]>, string] {
    const guardsAndMatchers = params.map(t => this._convertParamToUnion(t));
    const guards = guardsAndMatchers.map(x => x[0]);
    const matchers = guardsAndMatchers.map(x => x[1]);
    const description = guardsAndMatchers.map(x => x[2]).join(',');
    const _tuple = tuple(guards);
    const _convert = mapper(matchers);
    return [_tuple, _convert, `[${description}]`];
  }

  /**
   * Given a type param, returns the runtype
   * Arrays are converted to intersections
   * 
   */
  private _convertParamToUnion(types: Type[]): [Guard<unknown>, Conversion<unknown, unknown>, string] {
    const len = types.length;
    // @ts-ignore
    const converters: Array<Conversion<unknown, unknown>> = types.map(() => id);
    const guards = types.map(t => this._getGuard(t));

    const descriptions = types.map(getName);
    
    types.forEach(toType => {
      const conversions = this.conversions.get(toType) || [];
      conversions.forEach(({ fromName, fromGuard, convert }) => {
        if (guards.indexOf(fromGuard) < 0) {
          guards.push(fromGuard);
          converters.push(convert);
          descriptions.push(fromName);
        }
      });
    });

    const _union = union(guards);
    const description = descriptions.join('|');

    if (guards.length === len) {
      // Optimization when no conversions were added
      return [_union, id, description];
    }

    const _match = matcher(guards, converters);
    return [_union, _match, description];
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
      const fromGuard = this._getGuard(fromType);
      const fromName = getName(fromType);

      const conversion: ConversionMethod = {
        fromName,
        fromGuard,
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
  try {
    return ('name' in token && typeof token.name === 'string') ? token.name : 'unknown';
  } catch (err) {
    return 'unknown';
  }
}
