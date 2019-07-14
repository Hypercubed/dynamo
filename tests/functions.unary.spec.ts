import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Dynamo, signature } from '../src';

const dynamo = new Dynamo();

class S {
  name = 'foo';

  @signature()
  s(value: number): string {
    return 'number: ' + value;
  }
}

const s = dynamo.function(S);

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
  }, 'Unexpected type of argument');
});

test('should throw when given too few arguments', t => {
  t.throws(() => {
    // @ts-ignore
    s();
  }, 'Unexpected type of argument');
});

test('should throw when given invalid arguments', t => {
  t.throws(() => {
    // @ts-ignore
    s('hello');
  }, 'Unexpected type of argument');
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

const f = dynamo.function(F);

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

test('should correctly recognize Null from Object (both are an Object)', t => {
  t.is(f(null), 'Null');
  t.is(f({foo: 'bar'}), 'Object');
});

class UnknownType {

}

class T {
  name = 'foo';

  @signature()
  s(value: UnknownType): string {
    return 'UnknownType: ' + value;
  }
}

test('throws for unknown type', t => {
  t.throws(() => {
    const fn = dynamo.function(T);
  }, 'Unknown type "UnknownType"');
});

class S2 {
  name = 'foo';

  @signature(Number)
  s2 = (value: number): string => {
    return 'number: ' + value;
  }
}

const s2 = dynamo.function(S2);

test('functions as props has the correct signature', t => {
  assert<IsExact<typeof s2, ((a: number) => string)>>(true);

  t.is(s2.name, 'foo');
  t.is(s2.length, 1);
});

test.only('functions as props calling the function works', t => {
  const a = s2(5);

  t.is(a, `number: 5`);

  assert<IsExact<typeof a, string>>(true);
});
