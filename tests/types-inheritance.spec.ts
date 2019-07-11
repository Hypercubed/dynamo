import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Typed, signature, guard } from '../src';

const typed = new Typed();

class Integer extends Number {
  @guard()
  static isInteger(x: unknown): x is Integer {
    // isNumber check is not attached to Number.
    /* if (typeof x !== 'number') {
      throw new Error('Should never be here, isNumber runs first!!');
    } */
    return typeof x === 'number' && Number.isInteger(x);
  }
}

class Zero extends Number {
  @guard()
  static isZero(x: unknown): x is Zero {
    return x === 0;
  }
}

class Positive extends Number {
  @guard()
  static isZero(x: unknown): x is Zero {
    return x > 0;
  }
}

class Negitive extends Number {
  @guard()
  static isZero(x: unknown): x is Zero {
    return x < 0;
  }
}

class Even extends Integer {
  @guard()
  static isEven(x: number) {
    if (typeof x !== 'number' || !Number.isInteger(x)) {
      throw new Error('Should never be here, isInteger runs first!!');
    }
    return x % 2 === 0;
  }
}

class Odd extends Integer {
  @guard()
  static isEven(x: number) {
    if (typeof x !== 'number' || !Number.isInteger(x)) {
      throw new Error('Should never be here, isInteger runs first!!');
    }
    return x % 2 !== 0;
  }
}

class Sign {
  @signature()
  zero(x: Zero) {
    return `${x} is zero`;
  }

  @signature()
  positive(x: Positive) {
    return `${x} is positive`;
  }

  @signature()
  negitive(x: Negitive) {
    return `${x} is negitive`;
  }
}

class Parity {
  @signature()
  even(x: Even) {
    return `${x} is even`;
  }

  @signature()
  odd(x: Odd) {
    return `${x} is odd`;
  }
}

class Person {
  @guard()
  static isPerson(x: unknown): x is Person {
    return x instanceof Person;
  }

  // tslint:disable-next-line:no-shadowed-variable
  constructor(public name: string, public age: number) {}
}

class Baby extends Person {
  @guard()
  static isBaby(x: Person): x is Baby {
    if (!(x instanceof Person)) {
      throw new Error('Should never be here, isPerson guard runs first!!');
    }
    return x.age < 1;
  }

  // tslint:disable-next-line:no-shadowed-variable
  constructor(public name: string, public age: number) {
    super(name, age);
  }
}

class Name {
  @signature()
  baby(x: Baby) {
    return `A baby named ${x.name}`;
  }

  @signature()
  person(x: Person) {
    return `A person named ${x.name}`;
  }
}

typed.add(Zero, Positive, Negitive, Even, Odd, Person, Baby);

const sign = typed.function(Sign);
const parity = typed.function(Parity);
const name = typed.function(Name);

test('sign', t => {
  assert<IsExact<typeof sign, (x: number) => string>>(true);

  t.is(sign(0), `0 is zero`);
  t.is(sign(10), `10 is positive`);
  t.is(sign(-10), `-10 is negitive`);
});

test('parity', t => {
  assert<IsExact<typeof parity, (x: number) => string>>(true);

  t.is(parity(0), `0 is even`);
  t.is(parity(10), `10 is even`);
  t.is(parity(11), `11 is odd`);

  t.throws(() => {
    // @ts-ignore
    parity('10');    
  }, 'Unexpected type of arguments. Expected [Even] or [Odd].');
});

test('name', t => {
  assert<IsExact<typeof name, (x: Person) => string>>(true);

  t.is(name(new Person('Mike', 42)), `A person named Mike`);
  t.is(name(new Baby('Mike', 0.5)), `A baby named Mike`);
  t.is(name(new Baby('Mike', 42)), `A person named Mike`);
});
