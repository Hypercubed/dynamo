import 'reflect-metadata';

import { create } from 'typed-function';

const ANON = '';
const METADATA_KEY = 'ts-typed-function:signitures';

export class TypedFunction {
  static create<T>(name?: string, signatures?: TypedSignatures): T {
    signatures = signatures || this.signatures(name);
    return typeof name === 'undefined' ?
      this.typed(signatures) :
      this.typed(name, signatures);
  }

  static signatures(name: string = ANON): TypedSignatures {
    if (!Object.prototype.hasOwnProperty.call(this, '_signatures')) {
      const target = this.prototype;
      if (Reflect.hasMetadata(METADATA_KEY, target)) {
        this._signatures = Reflect.getMetadata(METADATA_KEY, target) as SignaturesMap;
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
    const t = this._typed.create();
    t.types = [...this._typed.types];
    return this._typed = t;
  }
}

export function type(name?: Type) {
  return function(target: any, propertyKey: string) {
    const typed: Create = target.typed || target.constructor.typed;
    if (typed) {
      name = normalizeName(name || propertyKey);
      const test = target[propertyKey];
      typed.addType({ name, test });      
    }
  };
}

export function signature(name?: string | Type[], paramtypes?: Type[]) {
  if (typeof name !== 'string') {
    paramtypes = name;
    name = ANON;
  }

  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  
  return function(target: any, propertyKey: string) {
    const typed: Create = target.typed || target.constructor.typed;
    const existingTypes = typed.types.map((t: any) => t.name);
    const method = target[propertyKey];
    if (typeof method === 'function' && typeof name === 'string') {
      paramtypes = paramtypes || Reflect.getMetadata('design:paramtypes', target, propertyKey);
      if (paramtypes && Array.isArray(paramtypes)) {
        const typesKey = paramtypes.map((p) => {
          const n = normalizeName(p);
          if (
            !existingTypes.includes(n) &&
            typeof p === 'function'
            && n[0] === 'i'
            && n[1] === 's'
          ) {
            typed.addType({ name: n, test: (x: any): x is typeof p => x instanceof p }); 
          }
          return n;
        }).join(',');

        if (target.prototype !== undefined) {
          target = target.prototype;
        }

        const sourceSigs =  Reflect.getMetadata(METADATA_KEY, target) || {};
        const targetSigs = {
          ...sourceSigs,
          [name]: {
            ...sourceSigs[name],
            [typesKey]: method
          }
        };

        Reflect.defineMetadata(METADATA_KEY, targetSigs, target);
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
    case 'Object':
    case 'Array':
    case 'Function':
    case 'RegExp':
    case 'Date':
      return  x.name;
    default:
      return  'is' + x.name;
  }
}
