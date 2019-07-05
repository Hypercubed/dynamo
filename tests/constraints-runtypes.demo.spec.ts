import test from 'ava';
import { Typed, signature, guard } from '../src';
import { Number as NumberType, String as StringType, Static, Runtype, Record } from 'runtypes';
import { assert, IsExact } from 'conditional-type-checks';

const typed = new Typed();

function convertConstraint<T extends Runtype>(constraint: T) {
  class Constraint {
    static guard = constraint.guard;
  }

  if ('tag' in constraint) {
    Object.defineProperty(Constraint, 'name', { value: constraint['tag'] });
  }

  guard()(Constraint, 'guard');
  return Constraint;
}

const nonEmptyString = StringType.withConstraint(x => {
  return x.length > 0;
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

typed.add(NonEmptyString, Positive, Person);

class CreatePerson {
  @signature()
  person(name: NonEmptyString, age: Positive): Person {
    return { name, age };
  }
}

const createPerson = typed.function(CreatePerson);

test('example', t => {
  assert<IsExact<typeof createPerson, (name: NonEmptyString, age: Positive) => Person>>(true);

  t.throws(() => {
    // @ts-ignore
    createPerson(45, 45);
  }, 'No alternatives were matched');

  t.throws(() => {
    createPerson('', 45);
  }, 'No alternatives were matched');

  t.throws(() => {
    createPerson('Mike', -1.2);
  }, 'No alternatives were matched');

  t.deepEqual(createPerson('Mike', 45), { name: 'Mike', age: 45 });    // ok
});

class GetName {
  @signature()
  getName(p: Person): NonEmptyString {
    return p.name;
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
