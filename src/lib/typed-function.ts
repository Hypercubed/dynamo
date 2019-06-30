import 'reflect-metadata';

import * as typedFunction from 'typed-function';

const METADATA_KEY = 'ts-typed-function:signitures';

type Constructor = new(...args: any[]) => any;
type ParamType = string | Constructor;

interface Type {
  name: string;
  test: (x: any) => boolean;
}

interface Conversion<T, U> {
  from: string;
  to: string;
  convert: (x: T) => U;
}

export function signature(paramtypes?: ParamType[]) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  
  return function(target: any, propertyKey: string) {
    const method = target[propertyKey];
    
    if (typeof method === 'function') {
      paramtypes = paramtypes || Reflect.getMetadata('design:paramtypes', target, propertyKey);
      if (paramtypes && Array.isArray(paramtypes)) {
        method.signature = paramtypes.map(normalizeName).join(',');

        const sourceSigs =  Reflect.getMetadata(METADATA_KEY, target) || {};
        const targetSigs = {
          ...sourceSigs,
          [method.signature]: propertyKey
        };

        Reflect.defineMetadata(METADATA_KEY, targetSigs, target);
      }
    }
  };
}

type Intersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

function normalizeName(x: any): string {
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

export class Typed {
  constructor(private _typed = typedFunction.create()) {
  }

  create() {
    return new Typed(this._typed.create());
  }

  addType(type: Type) {
    this._typed.addType(type);
  }

  addConversion<T, U>(conversion: Conversion<T, U>) {
    this._typed.addConversion(conversion);
  }

  fromMap<T extends any>(name: string, map: T): Intersection<T[keyof T]> {
    if (name) {
      return this._typed(name, map);
    }
    return this._typed(map);
  }

  fromClass<T extends any>(ctor: T) {
    const name = ctor.typedName || ctor.name;
    const target = ctor.prototype;
  
    const map = Reflect.getMetadata(METADATA_KEY, target);
  
    let maxLength = 0;
    const sigMap = {};
    for (const sig in map) {
      const prop = map[sig];
      sigMap[sig] = target[prop];
      maxLength = Math.max(maxLength, target[prop].length);
    }
  
    const fn = this.fromMap<T['prototype']>(name, sigMap);
    Object.defineProperty(fn, 'length', { value: maxLength });
    return fn;
  }
}

export const typed = new Typed();
