import test from 'ava';
import { Typed, signature, guard } from '../src';
import { Number as NumberType, String as StringType, Static, Constraint, Record } from 'runtypes';
import { assert, IsExact, Has } from 'conditional-type-checks';

const typed = new Typed();

function convertConstraint(constraint: any) {
  class CC {
    static guard = constraint.guard;
  }

  Object.defineProperty(CC, 'name', { value: constraint.tag });
  guard()(CC, 'guard');
  return CC;
}

const nonEmptyString = StringType.withConstraint(x => {
  return typeof x === 'string' && x.length > 0;
});

// tslint:disable-next-line:variable-name
const NonEmptyString = convertConstraint(nonEmptyString);
type NonEmptyString = Static<typeof nonEmptyString>;

assert<IsExact<NonEmptyString, string>>(true);

const positive = NumberType.withConstraint(n => {
  return Number.isInteger(n) && n >= 0;
});

// tslint:disable-next-line:variable-name
const Positive = convertConstraint(positive);
type Positive = Static<typeof positive>;
assert<IsExact<Positive, number>>(true);

const person = Record({
  name: nonEmptyString,
  age: positive
});

// tslint:disable-next-line:variable-name
const Person = convertConstraint(person);
type Person = Static<typeof person>;

typed.add(NonEmptyString, Positive);

test('example', t => {
  class CreatePerson {
    @signature()
    person(name: NonEmptyString, age: Positive): Person {
      return { name, age };
    }
  }

  const createPerson = typed.function(CreatePerson);

  assert<IsExact<typeof createPerson, (name: NonEmptyString, age: Positive) => Person>>(true);

  t.throws(() => {
    // @ts-ignore
    createPerson(45, 45);
  }, 'Unexpected type of argument in function CreatePerson (expected: constraint$0, actual: number, index: 0)');

  t.throws(() => {
    createPerson('', 45);
  }, 'Unexpected type of argument in function CreatePerson (expected: constraint$0, actual: string, index: 0)');

  t.throws(() => {
    createPerson('Mike', -1.2);
  }, 'Unexpected type of argument in function CreatePerson (expected: constraint$1, actual: number, index: 1)');

  t.deepEqual(createPerson('Mike', 45), { name: 'Mike', age: 45 });    // ok
});
