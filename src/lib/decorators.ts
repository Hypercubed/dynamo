export const META_METHODS = Symbol('ts-typed-function:params');
export const META_GUARDS = Symbol('ts-typed-function:guards');
export const META_CONVERSIONS = Symbol('ts-typed-function:guards');

export interface SignatureData {
  key: string;
  types: Array<Type | Type[]>;
}

export function signature(...types: Array<Type | Type[]>) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }

  return (target: any, key: string) => {
    const method = target[key];

    if (typeof method === 'function') {
      if (types.length < 1) {
        types = Reflect.getMetadata('design:paramtypes', target, key) || [];
      }

      const meta: SignatureData[] = Reflect.getMetadata(META_METHODS, target) || [];

      const data: SignatureData = {
        key,
        types
      };

      Reflect.defineMetadata(META_METHODS, [...meta, data], target);
    }
  };
}

export interface ConversionData {
  key: string;
  fromType: Type;
  toType: Type;
}

export function conversion(fromType?: Type, toType?: Type) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }

  return (target: any, key: string) => {
    const method = target[key];

    if (typeof method === 'function') {
      if (typeof fromType === 'undefined') {
        const params = Reflect.getMetadata('design:paramtypes', target, key) || [];
        fromType = params[0] || '';
      }
      toType = toType || Reflect.getMetadata('design:returntype', target, key) || '';

      const meta: ConversionData[] = Reflect.getMetadata(META_CONVERSIONS, target) || [];

      const data: ConversionData = {
        key,
        fromType,
        toType
      };

      Reflect.defineMetadata(META_CONVERSIONS, [...meta, data], target);
    }
  };
}

export interface GuardData {
  key: string;
  type: Type;
}

export function guard(type?: Type) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  return (target: any, key: string) => {
    type = type || target;

    const meta: GuardData[] = Reflect.getMetadata(META_GUARDS, target) || [];

    const data: GuardData = {
      key,
      type
    };

    Reflect.defineMetadata(META_GUARDS, [...meta, data], target);
  };
}
