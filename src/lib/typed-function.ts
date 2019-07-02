/// <reference path="./types.d.ts" />

import 'reflect-metadata';
import * as typedFunction from 'typed-function';
import { META_METHODS, META_GUARDS, META_CONVERSIONS } from './decorators';

export class Typed {
  constructor(public _typed = typedFunction.create()) {
  }

  create() {
    return new Typed(this._typed.create());
  }

  add(...ctors: Constructor[]) {
    ctors.forEach(c => {
      this._addTypes(c);
      this._addConversions(c);      
    });

    return this;
  }

  function<T extends Constructor>(ctor: T): FunctionProperties<InstanceType<T>> {
    const target = new ctor();
    const name = target.name || ctor.name;
  
    const arr = Reflect.getMetadata(META_METHODS, target);

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

  private _addTypes(ctor: Constructor) {
    const guards = Reflect.getMetadata(META_GUARDS, ctor) || [];
    guards.forEach(({ key, guardName}) => {
      this._typed.addType({
        name: guardName,
        test: ctor[key]
      });
    });
  }

  private _addConversions(ctor: Constructor) {
    const target = ctor;
    const arr = Reflect.getMetadata(META_CONVERSIONS, target) || [];
    arr.forEach(({ key, parameterTypes, returnType }) => {
      this._typed.addConversion({
        from: parameterTypes,
        to: returnType,
        convert: target[key]
      });
    });
  }
}

export const typed = new Typed();
