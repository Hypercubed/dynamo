import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Typed, signature } from '../src';

const typed = new Typed();

test('union types', t => {
  class Fn {
    @signature([Number, Boolean])
    fn(arg: number | boolean): string {
      return typeof arg;
    }
  }

  const fn = typed.function(Fn);

  assert<IsExact<typeof fn, (arg: number | boolean) => string>>(true);

  t.is(fn(true), 'boolean');
  t.is(fn(2), 'number');
  t.throws(
    () => { fn('string' as any); },
    'Unexpected type of arguments. Expected [Number|Boolean].'
  );
});
