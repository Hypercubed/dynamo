import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Dynamo, signature } from '../src';

const dynamo = new Dynamo();

class S {
  name = 'foo';

  @signature()
  s(): string {
    return 'a string';
  }
}

const s = dynamo.function(S);

test('has the correct signature', t => {
  assert<IsExact<typeof s, (() => string)>>(true);

  t.is(s.name, 'foo');
  t.is(s.length, 0);
});

test('calling the function works', t => {
  const a = s();

  t.is(a, `a string`);

  assert<IsExact<typeof a, string>>(true);
});

test('should throw when given too many arguments', t => {
  t.throws(() => {
    // @ts-ignore
    s(1);
  }, 'Expected 0 arguments, but got 1');
});

test('should throw when given too many arguments, 3', t => {
  t.throws(() => {
    // @ts-ignore
    s(1, 2, 3);
  }, 'Expected 0 arguments, but got 3');
});

test('should pass context', t => {
  class F {
    @signature()
    n(): string {
      return `context is "${this}"`;
    }
  }

  const f = dynamo.function(F);

  t.is(f.call('this string'), `context is "this string"`);
});
