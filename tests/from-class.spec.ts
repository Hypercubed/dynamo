import test from 'ava';
import { Typed, signature } from '../src/lib/typed-function';

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

test('calling the function works', t => {
  const add = typed.function(Add);

  t.is(add(2, 3), 5);
  t.is(add('x', 'y'), 'xy');
});

test('has the correct signature', t => {
  const add = typed.function(Add);

  t.is(add.name, 'add');
  t.is(add.length, 2);
});

test('throws at runtime on bad signature', t => {
  const add = typed.function(Add);
  t.throws(() => {
    add(2, '4' as any);
  });
});

test('compile time check', t => {
  const add = typed.function(Add);
  t.false(onlyAcceptsStrings(add(2, 4) as any));
  t.throws(() => {
    t.false(onlyAcceptsNumbers(add(2, '4' as any)));
  });
  t.true(onlyAcceptsNumbers(add(2, 4)));

  function onlyAcceptsNumbers(x: number) {
    return typeof x === 'number';
  }
  function onlyAcceptsStrings(x: string) {
    return typeof x === 'string';
  }
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

test('can get nbame from class', t => {
  const mul = typed.function(Mul);

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
  @signature(['number'])
  @signature(['string'])
  double_prim(a: any): any {
    return a + a;
  }

  @signature()
  double_array(a: any[]) {
    return a.concat(a);
  }
}

test('can create function given types', t => {
  const double = typed.function(DoublePrim);

  t.is(double(2), 4);
  t.is(double('2'), '22');
  t.deepEqual(double(['2']), ['2', '2']);
  
  // this typed-function is names
  t.is(double.name, 'double');
  t.is(double.length, 1);
});

test.only('inherit', t => {

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

  t.throws(() => {
    t.is(a(42 as any), 'the number 42');
  });
  t.is(a('42'), 'the string 42');

  t.is(b(42), 'the number 42');
  t.is(b('42'), 'the string 42');
});
