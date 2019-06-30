import test from 'ava';
import { Typed, signature } from '../src/lib/typed-function';

const typed = new Typed();

class Convert {
  @signature()
  bton(x: boolean): number {
    return +x;
  }

  @signature(['number'])
  @signature(['boolean'])
  ntos(x: number | boolean): string {
    return '' + x;
  }
}

typed.addConversion(Convert);

class Fn1 {
  @signature(['string', 'string'])
  add_strings(a: boolean | string, b: string) {
    return `a is string, b is string`;
  }

  @signature(['number', 'string'])
  add_numebrs(a: number, b: string) {
    return `a is number, b is string`;
  }
}

test('calling the function works', t => {
  const fn = typed.function(Fn1);

  t.is(fn(true, 'X'), `a is number, b is string`);
  t.is(fn(3, 'X'), `a is number, b is string`);
  t.is(fn('Y', 'X'), `a is string, b is string`);
});

class Fn2 {
  @signature(['string', 'string'])
  add_strings(a: boolean | string | number, b: string) {
    return `a is string, b is string`;
  }

  @signature(['any', 'string'])
  add_any(a: any, b: string) {
    return `a is unknown, b is string`;
  }
}

test('should convert before matching any', t => {
  const fn = typed.function(Fn2);

  t.is(fn('Y', 'X'), `a is string, b is string`);
  t.is(fn(3, 'X'), `a is string, b is string`);  // see https://github.com/josdejong/typed-function/issues/14
  t.is(fn(true, 'X'), `a is string, b is string`);
});
