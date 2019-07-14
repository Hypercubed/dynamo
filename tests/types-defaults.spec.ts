import test from 'ava';
import { signature, Dynamo, Any } from '../src';

const dynamo = new Dynamo();

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

  @signature(Any)
  isAny(x: any): string {
    return `${x} is an something`;
  }
}

const fn = dynamo.function(Fn);

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
  t.is(fn(new Fn()), '[object Object] is an something');
});

class Fn2 {
  @signature([String, Number])
  isNumber(x: string | number): string {
    return `${x} is a string or number`;
  }

  @signature()
  isArray(x: [string, number]): string {
    return `[${x}] is an Array`;
  }
}

const fn2 = dynamo.function(Fn2);

test('complex default types', t => {
  t.is(fn2(42), '42 is a string or number');
  t.is(fn2('42'), '42 is a string or number');
  t.is(fn2(['42', 42]), '[42,42] is an Array');

  // @ts-ignore
  t.is(fn2(['42', true]), '[42,true] is an Array');
});

class Fn3 {
  @signature([String, undefined])
  isNumber(x: string | undefined): string {
    return `${x} is a string or undefined`;
  }

  @signature([Number, null])
  isArray(x: number | null): string {
    return `${x} is a number or null`;
  }
}

const fn3 = dynamo.function(Fn3);

test('complex default types with null and undefined', t => {
  t.is(fn3('42'), '42 is a string or undefined');
  t.is(fn3(undefined), 'undefined is a string or undefined');
  t.is(fn3(42), '42 is a number or null');
  t.is(fn3(null), 'null is a number or null');
});
