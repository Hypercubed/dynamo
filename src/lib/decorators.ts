export const META_METHODS = Symbol('ts-typed-function:params');
export const META_GUARDS = Symbol('ts-typed-function:guards');
export const META_CONVERSIONS = Symbol('ts-typed-function:guards');

export function signature(params?: TypeToken[], ret?: TypeToken) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  
  return function(target: any, key: string) {
    const method = target[key];
    
    if (typeof method === 'function') {
      params = params || Reflect.getMetadata('design:paramtypes', target, key) || [];
      ret = ret || Reflect.getMetadata('design:returntype', target, key) || '';

      const parameterTypes = params.map(normalizeName).join(',');
      const returnType = normalizeName(ret);

      const meta = Reflect.getMetadata(META_METHODS, target) || [];

      const data = {
        key,
        parameterTypes,
        returnType
      };

      Reflect.defineMetadata(META_METHODS, [...meta, data], target);
    }
  };
}

export function conversion(params?: TypeToken[], ret?: TypeToken) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  
  return function(target: any, key: string) {
    const method = target[key];
    
    if (typeof method === 'function') {
      params = params || Reflect.getMetadata('design:paramtypes', target, key) || [];
      ret = ret || Reflect.getMetadata('design:returntype', target, key) || '';

      const parameterTypes = params.map(normalizeName).join(',');
      const returnType = normalizeName(ret);

      const meta = Reflect.getMetadata(META_CONVERSIONS, target) || [];

      const data = {
        key,
        parameterTypes,
        returnType
      };

      Reflect.defineMetadata(META_CONVERSIONS, [...meta, data], target);
    }
  };
}

export function guard(token?: TypeToken) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  return function(target: any, key: string) {
    token = token || target;

    const guardName = normalizeName(token);

    const meta = Reflect.getMetadata(META_GUARDS, target) || [];

    const data = {
      key,
      guardName
    };

    Reflect.defineMetadata(META_GUARDS, [...meta, data], target);
  };
}

function normalizeName(x: TypeToken): string {
  if (typeof x === 'string') return x;
  if (x === null || x === undefined || typeof x.name !== 'string') return String(x);
  switch (x.name) {
    case 'String':
    case 'Number':
    case 'Boolean':
      return String.prototype.toLowerCase.call(x.name);
    default:
      return  x.name;
  }
}
