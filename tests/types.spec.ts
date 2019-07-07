import test from 'ava';
import { signature, Typed, guard } from '../src';

const typed = new Typed();

class Fish {
  @guard()
  static isFish(a: any): a is Fish {
    return a instanceof Fish;
  }

  constructor(public name: string) {}
}

typed.add(Fish);

test('implicit type', t => {
  class Fn {
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
  
  const fn = typed.function(Fn);

  t.is(typeof fn, 'function');
  t.is(fn(15, true), 'a is the number 15, b is TRUE');
  t.is(fn('hello'), 'a is "hello"');
  t.is(fn(new Fish('wanda')), 'a is a fish named wanda');

  try {
    (fn as any)(42, 'false');
  } catch (err) {
    t.is(
      err.toString(),
      'Error: No alternatives were matched'
    );
  }

  t.is(fn.name, 'Fn');
  t.is(fn.length, 2);
});

test('explicit type', t => {
  class Fn {
    @signature()
    num(a: number, b: boolean) {
      return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
    }
  
    @signature()
    str(a: string) {
      return `a is "${a}"`;
    }

    @signature(Fish)
    fish(a: Fish) {
      return `a is a fish named ${a.name}`;
    }
  }
  
  const fn = typed.function(Fn);

  t.is(typeof fn, 'function');
  t.is(fn(15, true), 'a is the number 15, b is TRUE');
  t.is(fn('hello'), 'a is "hello"');
  t.is(fn(new Fish('wanda')), 'a is a fish named wanda');

  try {
    (fn as any)(42, 'false');
  } catch (err) {
    t.is(
      err.toString(),
      'Error: No alternatives were matched'
    );
  }

  t.is(fn.name, 'Fn');
  t.is(fn.length, 2);
});

// tslint:disable-next-line:variable-name
const Zero = Object.create(null);

// tslint:disable-next-line:variable-name
const Negative = Object.create(null);

class Tests {
  @guard(Zero)
  static isZero({a}) {
    return a === 0;
  }

  @guard(Negative)
  static isNegative({a}) {
    return a < 0;
  }
}

typed.add(Tests);

test('adding multiple types', t => {
  class Fn {
    @signature(Zero)
    zero({a}): string {
      return `a is zero`;
    }

    @signature(Negative)
    negative({a}): string {
      return `a is negative`;
    }

    @signature()
    num({a}): string {
      return `a is a number`;
    }
  }
  
  const fn = typed.function(Fn);

  t.is(fn({a: 10}), 'a is a number');
  t.is(fn({a: 0}), 'a is zero');
  t.is(fn({a: -10}), 'a is negative');
});

const oldFish = Fish;

test('prevent collisions', t => {
  // tslint:disable-next-line:no-shadowed-variable
  class Fish {
    @guard(Fish)
    static isFish(a: any): a is Fish {
      return a instanceof Fish;
    }
  
    constructor(public name: string) {}
  }

  typed.add(Fish);

  class Fn {
    @signature(oldFish)
    old_fish(x: any): string {
      return `a is the old fish`;
    }

    @signature(Fish)
    new_fish(x: Fish): string {
      return `a is the new fish`;
    }
  }
  
  const fn = typed.function(Fn);

  t.is(fn(new Fish('Nemo')), `a is the new fish`);
  t.is(fn(new oldFish('Nemo')), `a is the old fish`);
});
