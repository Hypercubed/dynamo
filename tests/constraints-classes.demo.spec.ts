import test from 'ava';
import { assert, IsExact } from 'conditional-type-checks';

import { Typed, signature, guard } from '../src';

const typed = new Typed();

type INonEmptyString =  string;
class NonEmptyString {
  @guard()
  static isNonEmptyString(x: INonEmptyString) {
    return x.length > 0;
  }
}

type IPositive =  number;
class Positive {
  @guard()
  static isInt(n: IPositive) {
    return Number.isInteger(n) && n >= 0;
  }
}

class Person {
  @guard()
  static isPerson(p: any): p is Person {
    return p instanceof Person;
  }

  constructor(public name: string, public age: number) {
  }
}

typed.add(NonEmptyString, Positive, Person);

class CreatePerson {
  @signature(NonEmptyString, Positive)
  person(name: INonEmptyString, age: IPositive): Person {
    return new Person(name, age);
  }
}

const createPerson = typed.function(CreatePerson);

test('example', t => {
  assert<IsExact<typeof createPerson, (name: string, age: number) => Person>>(true);

  t.throws(() => {
    // @ts-ignore
    createPerson(45, 45);
  });

  t.throws(() => {
    createPerson('', 45);
  });

  t.throws(() => {
    createPerson('Mike', -1.2);
  });

  const mike = createPerson('Mike', 45);
  assert<IsExact<typeof mike, Person>>(true);

  t.deepEqual({ ...mike }, { name: 'Mike', age: 45 });    // ok
});

class GetName {
  @signature()
  getName(person: Person): NonEmptyString {
    return person.name;
  }
}

const getName = typed.function(GetName);

test('getName', t => {
  assert<IsExact<typeof getName, (person: Person) => NonEmptyString>>(true);

  t.throws(() => {
    // @ts-ignore
    getName(45);
  }, 'No alternatives were matched');

  const mike = createPerson('Mike', 45);
  t.is(getName(mike), 'Mike');
});
