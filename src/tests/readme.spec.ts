// tslint:disable:no-expression-statement member-ordering no-shadowed-variable
import { test } from 'ava';
import { signature, type, TypedFunction } from '../lib/typed-function-decorators';

test('basic example', t => {
  class Fish {
    constructor(public name: string) {}
  }

  class Fn extends TypedFunction {
    @signature()
    num(a: number, b: boolean) {
      return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
    }
  
    @signature()
    str(a: string) {
      return `a is "${a}"`;
    }

    @signature()
    fish(a: Fish) {
      return `a is a fish named ${a.name}`;
    }
  }
  
  const fn = Fn.create<Fn['num'] & Fn['str'] & Fn['fish']>();

  t.is(typeof fn, 'function');
  t.is(fn(15, true), 'a is the number 15, b is TRUE');
  t.is(fn('hello'), 'a is "hello"');
  t.is(fn(new Fish('wanda')), 'a is a fish named wanda');

  try {
    (fn as any)(42, 'false');
  } catch (err) {
    t.is(
      err.toString(),
      'TypeError: Unexpected type of argument in function unnamed (expected: boolean, actual: string, index: 1)'
    );
  }

  t.is(fn.name, '');
});

test('implicit construictor type', t => {
  class Fish {
    constructor(public name: string) {}
  }
  
  class Fn extends TypedFunction {
    @signature()
    name(x: Fish): string { return x.name; }
  }
  
  const fn = Fn.create<Fn['name']>();

  t.is(typeof fn, 'function');
  t.is(fn(new Fish('Wanda')), 'Wanda');
});

test('explicit construictor type', t => {
  class Pet {
    constructor(public type: string, public name: string) {}
  }

  interface Fish extends Pet {
    type: 'fish';
  }
  
  class Fn extends TypedFunction {
    @type('Fish')
    isFish(arg: Pet): arg is Fish {
      return arg instanceof Pet && arg.type === 'fish';
    }

    @signature(['Fish'])
    name(x: Pet): string { return `A fish named ${x.name}`; }
  }
  
  const fn = Fn.create<Fn['name']>();

  t.is(typeof fn, 'function');
  t.is(fn(new Pet('fish', 'Wanda')), 'A fish named Wanda');
});

test('named example', t => {
  class Fn extends TypedFunction {
    @signature('double')
    double(a: string) {
      return a + a;
    }
  
    @signature('double')
    twice(a: number) {
      return 2 * a;
    }

    @signature('power')
    pow(a: number, b: number) {
      return a ** b;
    }
  
    // This will be combined with the signature above
    @signature('repeat')
    @signature('power')
    repeat(a: string, b: number) {
      return a.repeat(b);
    }
  }
  
  const double = Fn.create<Fn['double'] & Fn['twice']>('double');
  const power = Fn.create<Fn['pow'] & Fn['repeat']>('power');
  const repeat = Fn.create<Fn['repeat']>('repeat');

  t.is(typeof double, 'function');
  t.is(double.name, 'double');

  t.is(typeof power, 'function');
  t.is(power.name, 'power');

  t.is(typeof repeat, 'function');
  t.is(repeat.name, 'repeat');

  t.is(double(15), 30);
  t.is(double('boo'), 'booboo');

  t.is(power(2, 3), 8);
  t.is(power('boo', 3), 'boobooboo');

  t.is(repeat('boo', 3), 'boobooboo');
});

test('ts override example', t => {
  class Fn extends TypedFunction {
    double(a: string): string;
    double(a: number): number;
  
    @signature('double', ['string'])
    @signature('double', ['number'])
    double(a: any): any {
      return a + a;
    }
  }
  
  const double = Fn.create<Fn['double']>('double');

  t.is(typeof double, 'function');
  t.is(double.name, 'double');

  t.is(double(15), 30);
  t.is(double('boo'), 'booboo');
});
