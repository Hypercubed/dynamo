import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Dynamo, signature, guard } from '../src';

const dynamo = new Dynamo();

class Name extends String {
  @guard()
  static isNonEmptyString(x: string) {
    return x.length > 0;
  }
}

class Age extends Number {
  @guard()
  static isInt(n: number) {
    return Number.isInteger(n) && n >= 0;
  }
}

class Person {
  @guard()
  static isPerson(p: any): p is Person {
    return p instanceof Person;
  }

  readonly kind = '$person';

  constructor(public name: Name, public age: Age) {
  }
}

dynamo.add(Name, Age, Person);

class CreatePerson {
  @signature()
  person(name: Name, age: Age): Person {
    return new Person(name, age);
  }
}

const createPerson = dynamo.function(CreatePerson);

test('types are correct', t => {
  assert<Has<number, Age>>(true);
  assert<Has<string, Name>>(true);

  assert<Has<string, Age>>(false);
  assert<Has<number, Name>>(false);
  t.pass();
});

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

  t.deepEqual({ ...mike }, { name: 'Mike', age: 45, kind: '$person' });    // ok
});

class GetName {
  @signature()
  getName(person: Person): Name {
    return person.name;
  }
}

const getName = dynamo.function(GetName);

test('getName', t => {
  assert<IsExact<typeof getName, (person: Person) => Name>>(true);

  t.throws(() => {
    // @ts-ignore
    getName(45);
  }, 'Unexpected type of arguments. Expected [Person].');

  t.throws(() => {
    // @ts-ignore
    getName({ name: 'Mike', age: 45 });
  }, 'Unexpected type of arguments. Expected [Person].');

  const mike = createPerson('Mike', 45);
  t.is(getName(mike), 'Mike');
});
