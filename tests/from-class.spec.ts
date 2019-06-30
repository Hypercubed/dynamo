// tslint:disable:no-expression-statement member-ordering no-shadowed-variable
import test from 'ava';
import { Typed, signature } from '../src/lib/typed-function';

const typed = new Typed();

class Add {
  @signature()
  add_numbers(a: number, b: number) {
    return a + b;
  }

  @signature()
  add_strings(a: string, b: string) {
    return a + b;
  }
}

const add = typed.fromClass(Add);

test('calling the function works', t => {
  t.is(add(2, 3), 5);
  t.is(add('x', 'y'), 'xy');
});

test('has the correct signature', t => {
  t.is(add.name, 'Add');
  t.is(add.length, 2);
});

test('throws at runtime on bad signature', t => {
  const add = typed.fromClass(Add);
  t.throws(() => {
    add(2, '4' as any);
  });
});

test('compile time check', t => {
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
  static typedName = 'mul';

  @signature()
  mul_numbers(a: number, b: number) {
    return a * b;
  }

  @signature()
  repeat_strings(a: string, b: number) {
    return a.repeat(b);
  }
}

const mul = typed.fromClass(Mul);

test('can be given a name', t => {
  // this typed-function is unnamed
  t.is(mul.name, 'mul');
  t.is(mul.length, 2);
});

class DoublePrim {
  static typedName = 'double';

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

const double = typed.fromClass(DoublePrim);

test('can create function given types', t => {
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
  
  const a = typed.fromClass(A);
  const b = typed.fromClass(B);

  t.throws(() => {
    t.is(a(42 as any), 'the number 42');
  });
  t.is(a('42'), 'the string 42');

  t.is(b(42), 'the number 42');
  t.is(b('42'), 'the string 42');
});
