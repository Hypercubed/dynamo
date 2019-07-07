export const META_METHODS = Symbol('ts-typed-function:params');
export const META_GUARDS = Symbol('ts-typed-function:guards');
export const META_CONVERSIONS = Symbol('ts-typed-function:guards');

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

guard()(Null, 'isNull');
guard()(Undefined, 'isUndefined');

// A Parameter is a array of types
export type Parameter = Type[];

// A Signature is an array of Parameter
type Signature = Parameter[];

// A SignatureMap is a mapping of Signature[] by key
export interface SignatureMap {
  [key: string]: Signature[];
}

export function signature(...paramTypes: Array<Type | Parameter>) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }

  paramTypes = arguments.length > 0 ? paramTypes.map(t => fixType(t)) : paramTypes;

  return (target: any, key: string) => {
    if (typeof target[key] === 'function') {
      if (paramTypes.length < 1) {
        paramTypes = Reflect.getMetadata('design:paramtypes', target, key) || [];
      }

      // Converts types to a Signature
      const newSignature = paramTypes.map(t => {
        return Array.isArray(t) ? t : [t];
      });

      // Convert each parameter type into an array to types
      let map: SignatureMap = Reflect.getMetadata(META_METHODS, target) || {};
      const existingSignatures = map[key] || [];

      // note: new newSignature are added ahead of existingSignatures
      // decorators are process top to bottom in a class
      // but bottom to top per key
      map = {
        ...map,
        [key]: [ newSignature, ...existingSignatures ]  // note: new siginatures are 
      };

      Reflect.defineMetadata(META_METHODS, map, target);
    }
  };
}

interface ConversionItem {
  fromType: Type;
  toType: Type;
}

export interface ConversionMap {
  [key: string]: ConversionItem;
}

export function conversion(fromType?: Type, toType?: Type) {
  const arglen = arguments.length;

  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }

  return (target: any, key: string) => {
    const method = target[key];

    if (typeof method === 'function') {
      if (arglen === 0) {
        const params = Reflect.getMetadata('design:paramtypes', target, key) || [];
        // TODO: throw if conversion has more than one input
        fromType = params[0] || '';
      }
      toType = toType || Reflect.getMetadata('design:returntype', target, key) || '';

      let map: ConversionMap = Reflect.getMetadata(META_CONVERSIONS, target) || {};

      map = {
        ...map,
        [key]: {
          fromType: fixType(fromType),
          toType: fixType(toType),
        }
      };

      Reflect.defineMetadata(META_CONVERSIONS, map, target);
    }
  };
}

export interface GuardMap {
  [key: string]: Type;
}

export function guard(type?: Type) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }

  type = arguments.length > 0 ? fixType(type) : undefined;

  return (target: any, key: string) => {
    let map: GuardMap = Reflect.getMetadata(META_GUARDS, target) || {};

    map = {
      ...map,
      [key]: type
    };

    Reflect.defineMetadata(META_GUARDS, map, target);
  };
}

function fixType(x: Type): Type {
  if (arguments.length === 0) return;
  if (x === null) return Null;
  if (typeof x === 'undefined') return Undefined;
  return x;
}
