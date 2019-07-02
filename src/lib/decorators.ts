export const META_METHODS = Symbol('ts-typed-function:params');
export const META_GUARDS = Symbol('ts-typed-function:guards');
export const META_CONVERSIONS = Symbol('ts-typed-function:guards');

// tslint:disable-next-line:variable-name
export const Any = new Object(null);

const names = new WeakMap<TypeToken, string>();

names.set(Number, 'number');
names.set(String, 'string');
names.set(Boolean, 'boolean');
names.set(Function, 'Function');
names.set(Array, 'Array');
names.set(Date, 'Date');
names.set(RegExp, 'RegExp');
names.set(Object, 'Object');
names.set(Any, 'any');

let _uuid = 0;
function newTokenId(token: TypeToken) {
  const name = ('name' in token && typeof token.name === 'string') ? token.name : 'type';
  return `${name}\$${_uuid++}`;
}

export interface SignatureData {
  key: string;
  parameterTypes: string;
}

export function signature(...params: Array<TypeToken | TypeToken[]>) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }

  return (target: any, key: string) => {
    const method = target[key];

    if (typeof method === 'function') {
      if (params.length < 1) {
        params = Reflect.getMetadata('design:paramtypes', target, key) || [];
      }

      const parameterTypes = params.map(getName).join(',');

      const meta: SignatureData[] = Reflect.getMetadata(META_METHODS, target) || [];

      const data = {
        key,
        parameterTypes
      };

      Reflect.defineMetadata(META_METHODS, [...meta, data], target);
    }
  };
}

export interface ConversionData {
  key: string;
  parameterTypes: string;
  returnType: string;
}

export function conversion(param?: TypeToken, ret?: TypeToken) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }

  return (target: any, key: string) => {
    const method = target[key];

    if (typeof method === 'function') {
      if (typeof param === 'undefined') {
        const params = Reflect.getMetadata('design:paramtypes', target, key) || [];
        param = params[0] || '';
      }
      ret = ret || Reflect.getMetadata('design:returntype', target, key) || '';

      const parameterTypes = getName(param);
      const returnType = getName(ret);

      const meta: ConversionData[] = Reflect.getMetadata(META_CONVERSIONS, target) || [];

      const data = {
        key,
        parameterTypes,
        returnType
      };

      Reflect.defineMetadata(META_CONVERSIONS, [...meta, data], target);
    }
  };
}

export interface GuardData {
  key: string;
  guardName: string;
}

export function guard(token?: TypeToken) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  return (target: any, key: string) => {
    token = token || target;

    const guardName = getName(token);

    const meta: GuardData[] = Reflect.getMetadata(META_GUARDS, target) || [];

    const data = {
      key,
      guardName
    };

    Reflect.defineMetadata(META_GUARDS, [...meta, data], target);
  };
}

function getName(token: TypeToken | TypeToken[]): string {
  if (Array.isArray(token)) {
    return token.map(getName).join(' | ');
  }
  if (token === null || typeof token === 'undefined') {
    return String(token);
  }
  if (names.has(token)) {
    return names.get(token);
  }

  const name = newTokenId(token);
  names.set(token, name);
  return name;
}
