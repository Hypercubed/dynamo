import 'reflect-metadata';

import * as typedFunction from 'typed-function';

const META_KEY = 'ts-typed-function:params';

interface Constructor {
  prototype: any;
  new(...args: any[]);
}

type AnyFunction = (...args: any[]) => any;
type ParamType = string | Constructor;

interface SignatureMap {
  [key: string]: AnyFunction;
}

interface Type {
  name: string;
  test: (x: any) => boolean;
}

interface Conversion<T, U> {
  from: string;
  to: string;
  convert: (x: T) => U;
}

export function signature(paramtypes?: ParamType[], returntype?: ParamType) {
  if (typeof Reflect !== 'object') {
    throw new Error('reflect-metadata not found');
  }
  
  return function(target: any, key: string) {
    const method = target[key];
    
    if (typeof method === 'function') {
      paramtypes = paramtypes || Reflect.getMetadata('design:paramtypes', target, key) || [];
      returntype = returntype || Reflect.getMetadata('design:returntype', target, key) || '';

      const parameterTypes = paramtypes.map(normalizeName).join(',');
      const returnType = normalizeName(returntype);

      const meta = Reflect.getMetadata(META_KEY, target) || [];

      const data = {
        key,
        parameterTypes,
        returnType
      };

      Reflect.defineMetadata(META_KEY, [...meta, data], target);
    }
  };
}

type FunctionKeys<T> = { [K in keyof T]: T[K] extends AnyFunction ? K : never }[keyof T];
type Intersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type FunctionProperties<T> = Intersection<T[FunctionKeys<T>]>;

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
  constructor(public _typed = typedFunction.create()) {
  }

  create() {
    return new Typed(this._typed.create());
  }

  addType(type: Type) {
    this._typed.addType(type);
  }

  addConversion(ctor: Constructor) {
    const target = new ctor();
    const arr = Reflect.getMetadata(META_KEY, target) || [];
    arr.forEach(({ key, parameterTypes, returnType }) => {
      this._typed.addConversion({
        from: parameterTypes,
        to: returnType,
        convert: target[key]
      });
    });
  }

  function<T extends Constructor>(ctor: T): FunctionProperties<InstanceType<T>> {
    const target = new ctor();
    const name = target.name || ctor.name;
  
    const arr = Reflect.getMetadata(META_KEY, target);

    let maxLength = 0;
    const sigMap: any = {};
    arr.forEach(({ key, parameterTypes }) => {
      sigMap[parameterTypes] = target[key];
      maxLength = Math.max(maxLength, target[key].length);
    });
  
    const fn = this._typed(name, sigMap);

    // see https://github.com/josdejong/typed-function/issues/13
    Object.defineProperty(fn, 'length', { value: maxLength });
    return fn;
  }
}

export const typed = new Typed();
