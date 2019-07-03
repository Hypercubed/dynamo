import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Typed, signature } from '../src/';

const typed = new Typed();

class S {
  name = 'foo';

  @signature()
  s(value: number): string {
    return 'number: ' + value;
  }
}

const s = typed.function(S);

test('has the correct signature', t => {
  assert<IsExact<typeof s, ((a: number) => string)>>(true);

  t.is(s.name, 'foo');
  t.is(s.length, 1);
});

test('calling the function works', t => {
  const a = s(5);

  t.is(a, `number: 5`);

  assert<IsExact<typeof a, string>>(true);
});

test('should throw when given too many arguments', t => {
  t.throws(() => {
    // @ts-ignore
    s(1, 2);
  }, 'Too many arguments in function foo (expected: 1, actual: 2)');
});

test('should throw when given too few arguments', t => {
  t.throws(() => {
    // @ts-ignore
    s();
  }, 'Too few arguments in function foo (expected: number, index: 0)');
});

test('should throw when given invalid arguments', t => {
  t.throws(() => {
    // @ts-ignore
    s('hello');
  }, 'Unexpected type of argument in function foo (expected: number, actual: string, index: 0)');
});

class F {
  // Must supply sig for null
  @signature(null)
  null(value: null): string {
    return 'Null';
  }

  @signature()
  date(value: Date): string {
    return 'Date';
  }

  @signature()
  obj(value: object): string {
    return 'Object';
  }
}

const f = typed.function(F);

test('has correct sig', t => {
  assert<Has<typeof f, ((value: object) => string)>>(true);
  assert<Has<typeof f, ((value: Date) => string)>>(true);
  assert<Has<typeof f, ((value: null) => string)>>(true);

  t.pass();
});

test('should correctly recognize Date from Object (both are an Object)', t => {
  t.is(f(new Date()), 'Date');
  t.is(f({foo: 'bar'}), 'Object');
});

test.only('should correctly recognize Null from Object (both are an Object)', t => {
  t.is(f(null), 'Null');
  t.is(f({foo: 'bar'}), 'Object');
});
