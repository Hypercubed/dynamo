import test from 'ava';
import { signature, Typed, Unknown, Undefined } from '../src';

const typed = new Typed();

class Fn {
  @signature()
  isNumber(x: number): string {
    return `${x} is a number`;
  }

  @signature()
  isString(x: string): string {
    return `${x} is a string`;
  }

  @signature()
  isBoolean(x: boolean): string {
    return `${x} is a boolean`;
  }

  @signature()
  // tslint:disable-next-line:ban-types
  isFunction(x: Function): string {
    return `x is a Function`;
  }

  @signature()
  isArray(x: any[]): string {
    return `[${x}] is an Array`;
  }

  @signature()
  isDate(x: Date): string {
    return `x is a Date`;
  }

  @signature()
  isRegExp(x: RegExp): string {
    return `${x} is a RegExp`;
  }

  // Does null get serialized??
  @signature(null)
  isNull(x: null): string {
    return `${x} is a null`;
  }

  @signature(undefined)
  isUndefined(x: undefined): string {
    return `${x} is a undefined`;
  }

  @signature()
  isObject(x: object): string {
    return `${x} is an object`;
  }

  @signature(Unknown)
  isUnknown(x: any): string {
    return `${x} is an Unknown`;
  }
}

const fn = typed.function(Fn);

test('default types', t => {
  t.is(fn(42), '42 is a number');
  t.is(fn('42'), '42 is a string');
  t.is(fn(true), 'true is a boolean');
  t.is(fn(fn), 'x is a Function');
  t.is(fn([42]), '[42] is an Array');
  t.is(fn(new Date()), 'x is a Date');
  t.is(fn(/abc/), '/abc/ is a RegExp');
  t.is(fn(null), 'null is a null');
  t.is(fn(undefined), 'undefined is a undefined');
  t.is(fn({}), '[object Object] is an object');
  t.is(fn(new Fn()), '[object Object] is an Unknown');
});
