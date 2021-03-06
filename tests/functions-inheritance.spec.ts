import test from 'ava';
import { assert, Has } from 'conditional-type-checks';

import { Dynamo, signature, Any } from '../src';

const dynamo = new Dynamo();

class A {
  @signature()
  string(x: string): string {
    return `the string ${x}`;
  }
}

class B extends A {
  @signature()
  number(x: number): string {
    return `the number ${x}`;
  }
}

const a = dynamo.function(A);
const b = dynamo.function(B);

test('has the correct signature', t => {
  assert<Has<typeof a, ((a: string) => string)>>(true);

  assert<Has<typeof a, ((a: string) => string)>>(true);
  assert<Has<typeof a, ((a: number) => string)>>(false);

  assert<Has<typeof b, ((a: string) => string)>>(true);
  assert<Has<typeof b, ((a: number) => string)>>(true);

  t.is(a.name, 'A');
  t.is(a.length, 1);
  t.is(b.name, 'B');
  t.is(b.length, 1);
});

test('functions inherit', t => {
  t.is(a('42'), 'the string 42');

  t.is(b(42), 'the number 42');
  t.is(b('42'), 'the string 42');

  t.throws(() => {
    // @ts-ignore
    t.is(a(42), 'the number 42');
  });
});
