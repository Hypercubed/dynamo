/// <reference path="./types.d.ts" />

import 'reflect-metadata';
import {
  guard,
  META_METHODS, META_GUARDS, META_CONVERSIONS,
  SignatureMap, GuardMap, ConversionMap, Parameter
} from './decorators';
import { 
  Number as NumberType, Boolean as BooleanType, String as StringType,
  Null, Function as FunctionType,
  Runtype, Tuple, Union, Guard, InstanceOf, Unknown, Undefined,
  Matcher1, Case
} from 'runtypes';
// import show from 'runtypes/lib/show';

declare module 'runtypes' {
  // tslint:disable-next-line:no-empty-interface
  interface Runtype<A> extends ObjectConstructor {}
}

export * from 'runtypes';

const I = (x: unknown) => x;

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
  static isUndefined = Undefined;

  @guard(Object)
  static isObject = Guard((x: any): x is object => {
    return typeof x === 'object' && x !== null && x.constructor === Object;
  });

  @guard(Unknown)
  static isAny = Unknown;
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
  private guards = new WeakMap<Type, Runtype>();
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
    const sequence = [];

    for (const key in map) {
      const signatures = map[key];
      signatures.forEach(signature => {
        maxLength = Math.max(maxLength, signature.length);
        const [g, converters] = this._getSignatureGuard(signature);
        sequence.push([g, {
          key,
          converters
        }]);
      });
    }

    const m = choose<any>(sequence);
    const fn = function(...args: unknown[]) {
      const { key, converters } = m(args);
      for (const i in converters) {
        args[i] = converters[i](args[i]);
      }
      return target[key].apply(this, args);
    };

    Object.defineProperty(fn, 'name', { value: name });
    Object.defineProperty(fn, 'length', { value: maxLength });
    return fn as any;
  }

  /**
   * Given an array type Parameters, returns the guard and matcher function
   */
  private _getSignatureGuard(params: Parameter[]): [Runtype, Array<Matcher1<any, any>>] {
    const length = params.length;
    const lengthGuard = Guard((x: any[]): x is any => x.length === length);
    
    const unionsAndMatchers = params.map(t => this._convertParamToUnion(t));
    const runtypes = unionsAndMatchers.map(x => x[0]);
    const matchers = unionsAndMatchers.map(x => x[1]);

    // @ts-ignore
    const tuple = Tuple(...runtypes);

    return [lengthGuard.And(tuple), matchers];
  }

  /**
   * Given a type param, returns the runtype
   * Arrays are converted to intersections
   * 
   */
  private _convertParamToUnion(types: Type[]): [Runtype, Matcher1<any, any>] {
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

    const runtypes = types.map(t => this._convertTypeToRuntype(t));

    // @ts-ignore
    const union = Union(...runtypes);
    return [union, union.match(...converters)];
  }

  private _convertTypeToRuntype(type: Type): Runtype {
    if (type === null) {
      return Null;
    }
    if (type === undefined) {
      return Undefined;
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
      const _guard = typeof method === 'object' ? method : Guard(method);
      // TODO: error if adding a guard for the same type
      this.guards.set(type, _guard);
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

function choose<Z>(cases: Array<[any, Z]>): (x: any) => Z {
  return (x: any) => {
    for (const [T, f] of cases) if (T.guard(x)) return f;
    throw new Error('No alternatives were matched');
  };
}
