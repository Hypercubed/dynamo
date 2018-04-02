import 'reflect-metadata';

import { create } from 'typed-function';

const ANON = '@@anon@@';

export interface SignaturesMap {
  [key: string]: Signatures;
}

const signaturesMap = new WeakMap<TypedFunction, SignaturesMap>();

export class TypedFunction {
  static create<T>(name: string = ANON, signatures?: Signatures): T {
    signatures = signatures || this.signatures(name);
    return name === ANON ?
      this.typed(signatures) :
      this.typed(name, signatures);
  }

  static signatures(name: string = ANON): Signatures {
    if (!Object.prototype.hasOwnProperty.call(this, '_signatures')) {
      const target = this.prototype;
      if (signaturesMap.has(target)) {
        this._signatures = signaturesMap.get(target) as SignaturesMap;
        signaturesMap.delete(target);
      }
    }
    return this._signatures[name] || {};
  }

  private static _typed = create();
  private static _signatures: SignaturesMap = {};

  protected static get typed(): Create {
    if (Object.prototype.hasOwnProperty.call(this, '_typed')) {
      return this._typed;
    }
    // todo: this should inherit existing signatures and types
    return this._typed = this._typed.create();
  }
}

export function type(name?: string) {
  return function(target: any, propertyKey: string) {
    const typed: Create = target.typed || target.constructor.typed;
    if (typed) {
      name = name || propertyKey;
      const test = target[propertyKey];
      typed.addType({ name, test });      
    }
  };
}

export function signature(name?: string | string[], paramtypes?: string[]) {
  if (typeof name !== 'string') {
    paramtypes = name;
    name = ANON;
  }

  if (!paramtypes && typeof Reflect !== 'object') {
    throw new Error('method signature not defined and reflect-metadata not found');
  }
  
  return function(target: any, propertyKey: string) {
    const method = target[propertyKey];
    if (typeof method === 'function' && typeof name === 'string') {
      paramtypes = paramtypes || Reflect.getMetadata('design:paramtypes', target, propertyKey);
      if (paramtypes && Array.isArray(paramtypes)) {
        const typesKey = paramtypes.map(normalizeName).join(',');

        if (target.prototype !== undefined) {
          target = target.prototype;
        }

        const signatures = signaturesMap.get(target) || {};
        signatures[name] = signatures[name] || {};
        signatures[name][typesKey] = method;

        signaturesMap.set(target, signatures);
      }
    }
  };
}

function normalizeName(x: any): string {
  if (typeof x === 'string') return x;
  if (x === null || x === undefined || typeof x.name !== 'string') return String(x);
  switch (x.name) {
    case 'String':
    case 'Number':
    case 'Boolean':
      return String.prototype.toLowerCase.call(x.name);
    default:
      return x.name;
  }
}
