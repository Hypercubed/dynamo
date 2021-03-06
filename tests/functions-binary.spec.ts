import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Dynamo, signature } from '../src';

const dynamo = new Dynamo();

class Add {
  name = 'add';

  @signature()
  add_numbers(a: number, b: number) {
    return a + b;
  }

  @signature()
  add_strings(a: string, b: string) {
    return a + b;
  }
}

const add = dynamo.function(Add);

test('has the correct signature', t => {
  assert<Has<typeof add, ((a: number, b: number) => number)>>(true);
  assert<Has<typeof add, ((a: string, b: string) => string)>>(true);

  t.is(add.name, 'add');
  t.is(add.length, 2);
});

test('calling the function works', t => {
  const a = add(2, 3);
  const b = add('x', 'y');

  t.is(a, 5);
  t.is(b, 'xy');

  assert<IsExact<typeof a, number>>(true);
  assert<IsExact<typeof b, string>>(true);
});

test('throws at runtime on bad signature', t => {
  assert<Has<typeof add, ((a: number, b: string) => any)>>(false);

  t.throws(() => {
    // @ts-ignore
    add('4', 2);
  });
});

class Mul {
  @signature()
  mul_numbers(a: number, b: number) {
    return a * b;
  }

  @signature()
  repeat_strings(a: string, b: number) {
    return a.repeat(b);
  }
}

const mul = dynamo.function(Mul);

test('mul has the correct signature', t => {
  assert<Has<typeof mul, ((a: number, b: number) => number)>>(true);
  assert<Has<typeof mul, ((a: string, b: number) => string)>>(true);

  t.is(mul.name, 'Mul');
  t.is(mul.length, 2);
});

test('should pass context', t => {
  class F {
    @signature()
    numbers(a: number, b: number) {
      return `the context to numbers is "${this}"`;
    }
  
    @signature()
    strings(a: string, b: string) {
      return `the context to strings is "${this}"`;
    }
  }

  const f = dynamo.function(F);

  t.is(f.call('this string', 'a', 'b'), `the context to strings is "this string"`);
  t.is(f.call('a different string', 1, 2), `the context to numbers is "a different string"`);
});
