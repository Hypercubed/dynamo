/// <reference path="./types.d.ts" />

import 'reflect-metadata';
import * as typedFunction from 'typed-function';
import { META_METHODS, META_GUARDS, META_CONVERSIONS, SignatureData, ConversionData, GuardData } from './decorators';

interface TypedOptions {
  typed?: any;
}

export class Typed {
  private _typed: any;

  constructor(private options: TypedOptions = {}) {
    this._typed = options.typed || typedFunction.create();
  }

  create() {
    const _typed = typedFunction.create();

    _typed.types = this._typed.types.slice();
    _typed.conversions = this._typed.conversions.slice();

    return new Typed({
      ...this.options,
      typed: _typed
    });
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

    if (!arr || arr.length < 0) {
      throw new Error('No signatures provided');
    }

    let maxLength = 0;
    const sigMap: any = {};
    arr.forEach(({ key, parameterTypes }: SignatureData) => {
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
    guards.forEach(({ key, guardName}: GuardData) => {
      this._typed.addType({
        name: guardName,
        test: ctor[key]
      });
    });
  }

  private _addConversions(ctor: Constructor) {
    const arr = Reflect.getMetadata(META_CONVERSIONS, ctor) || [];
    arr.forEach(({ key, parameterTypes, returnType }: ConversionData) => {
      this._typed.addConversion({
        from: parameterTypes,
        to: returnType,
        convert: ctor[key]
      });
    });
  }
}

export const typed = new Typed();
