import test from 'ava';
import { Typed, signature, guard } from '../src';

const typed = new Typed();

class NonEmptyString {
  @guard()
  static isNonEmptyString(x: string) {
    return x.length > 0;
  }
}

class Int {
  @guard()
  static isInt(n: number) {
    return Number.isInteger(n) && n >= 0;
  }
}

interface IPerson {
  name: string;
  age: number;
}

class CreatePerson {
  @signature(NonEmptyString, Int)
  person(name: NonNullable<string>, age: NonNullable<number>): IPerson {
    return { name, age };
  }
}

typed.add(NonEmptyString, Int);

test('example', t => {
  const createPerson = typed.function(CreatePerson);

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

  t.deepEqual(createPerson('Mike', 45), { name: 'Mike', age: 45 });    // ok
});
