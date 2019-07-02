import test, { ExecutionContext } from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Typed, signature } from '../src/';

const typed = new Typed();

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

const add = typed.function(Add);

test('calling the function works', t => {
  const a = add(2, 3);
  const b = add('x', 'y');

  t.is(a, 5);
  t.is(b, 'xy');

  assert<IsExact<typeof a, number>>(true);
  assert<IsExact<typeof b, string>>(true);
});

test('has the correct signature', t => {
  assert<Has<typeof add, ((a: number, b: number) => number)>>(true);
  assert<Has<typeof add, ((a: string, b: string) => string)>>(true);

  t.is(add.name, 'add');
  t.is(add.length, 2);
});

test('throws at runtime on bad signature', t => {
  assert<Has<typeof add, ((a: number, b: string) => any)>>(false);

  t.throws(() => {
    add('4' as any, 2 as any);
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

const mul = typed.function(Mul);

test('mul has the correct signature', t => {
  assert<Has<typeof mul, ((a: number, b: number) => number)>>(true);
  assert<Has<typeof mul, ((a: string, b: number) => string)>>(true);

  // this typed-function is unnamed
  t.is(mul.name, 'Mul');
  t.is(mul.length, 2);
});

class DoublePrim {
  name = 'double';

  // Here we are using a single function for multiple types
  // These are TS overrides
  double_prim(a: string): string;
  double_prim(a: number): number;

  // Here we are "assigning" them to a function named 'double'.
  // Notice here we are defining each signature, we cannot infer the type from an override method
  @signature(Number)
  @signature(String)
  double_prim(a: any): any {
    return a + a;
  }

  @signature()
  double_array(a: any[]): any[] {
    return a.concat(a);
  }
}

const double = typed.function(DoublePrim);

test('can create function given types', t => {
  assert<Has<typeof double, ((a: number) => number)>>(true);
  assert<Has<typeof double, ((a: string) => string)>>(true);
  assert<Has<typeof double, ((a: any[]) => any[])>>(true);

  assert<Has<typeof double, ((a: number) => string)>>(false);
  assert<Has<typeof double, ((a: string) => number)>>(false);
  assert<Has<typeof double, ((a: any[]) => [any])>>(false);

  t.is(double(2), 4);
  t.is(double('2'), '22');
  t.deepEqual(double(['2']), ['2', '2']);
  
  // this typed-function is names
  t.is(double.name, 'double');
  t.is(double.length, 1);
});

test('inherit', t => {

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
  
  const a = typed.function(A);
  const b = typed.function(B);

  assert<Has<typeof a, ((a: string) => string)>>(true);

  assert<Has<typeof a, ((a: string) => string)>>(true);
  assert<Has<typeof a, ((a: number) => string)>>(false);

  assert<Has<typeof b, ((a: string) => string)>>(true);
  assert<Has<typeof b, ((a: number) => string)>>(true);

  t.throws(() => {
    t.is(a(42 as any), 'the number 42');
  });
  t.is(a('42'), 'the string 42');

  t.is(b(42), 'the number 42');
  t.is(b('42'), 'the string 42');
});

test('should correctly recognize Date from Object (both are an Object)', t => {
  class Signatures {
    @signature(Object)
    obj(value: object): string {
      t.assert(value instanceof Object);
      return 'Object';
    }

    @signature()
    date(value: Date): string {
      t.assert(value instanceof Date);
      return 'Date';
    }
  }

  const fn = typed.function(Signatures);

  assert<Has<typeof fn, ((value: object) => string)>>(true);
  assert<Has<typeof fn, ((value: Date) => string)>>(true);
  assert<Has<typeof fn, ((value: boolean) => string)>>(false);

  t.is(fn(new Date()), 'Date');
  t.is(fn({foo: 'bar'}), 'Object');
});

test('should throw an error when not providing any signatures', t => {
  t.throws(() => {
    typed.function(class A {});
  }, 'No signatures provided');
});

test('should throw an error when composing with an unknown type', t => {
  t.throws(() => {
    class Foo {
      name: 'foo';
    }

    class SN {
      @signature()
      s(value: Foo) {
        return 'number:' + value;
      }
    }

    const fn = typed.function(SN);
  }, 'Unknown type "Foo$0"');
});

class S {
  name = 'foo';

  @signature()
  s(value: number) {
    return 'number:' + value;
  }
}

const fns = typed.function(S);

test('should throw when given too many arguments', t => {
  t.throws(() => {
    (fns as any)(1, 2);
  }, 'Too many arguments in function foo (expected: 1, actual: 2)');
});

test('should throw when given too few arguments', t => {
  t.throws(() => {
    (fns as any)();
  }, 'Too few arguments in function foo (expected: number, index: 0)');
});

test('should throw when given invalid arguments', t => {
  t.throws(() => {
    (fns as any)('hello');
  }, 'Unexpected type of argument in function foo (expected: number, actual: string, index: 0)');
});
