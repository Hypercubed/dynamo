import test from 'ava';
import { Typed, signature, guard } from '../src';
import { Number as NumberType, String as StringType, Static, Runtype, Record } from 'runtypes';
import { assert, IsExact } from 'conditional-type-checks';

const typed = new Typed();

function convertGuard(_guard: AnyFunction, _name?: string) {
  class Guard {
    static guard = _guard;
  }

  if (_name) {
    Object.defineProperty(Guard, 'name', { value: _name });
  }
  
  guard()(Guard, 'guard');
  return Guard;
}

type NonEmptyString = string;
// tslint:disable-next-line:variable-name
const NonEmptyString = convertGuard((x: any) => {
  return typeof x === 'string' && x.length > 0;
});

type Positive = number;
// tslint:disable-next-line:variable-name
const Positive = convertGuard((n: any): n is Positive => {
  return Number.isInteger(n) && n >= 0;
});

interface Person {
  name: NonEmptyString;
  age: Positive;
}

// tslint:disable-next-line:variable-name
const Person = convertGuard((x: any) => {
  return Positive.guard(x.age) && NonEmptyString.guard(x.name);
});

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
  }, 'Unexpected type of argument in function CreatePerson (expected: Guard$0, actual: number, index: 0)');

  t.throws(() => {
    createPerson('', 45);
  }, 'Unexpected type of argument in function CreatePerson (expected: Guard$0, actual: string, index: 0)');

  t.throws(() => {
    createPerson('Mike', -1.2);
  }, 'Unexpected type of argument in function CreatePerson (expected: Guard$1, actual: number, index: 1)');

  const mike = createPerson('Mike', 45);

  assert<IsExact<typeof mike, Person>>(true);
  t.deepEqual(mike, { name: 'Mike', age: 45 });    // ok
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
  }, 'Unexpected type of argument in function GetName (expected: Guard$2, actual: number, index: 0)');

  const mike = createPerson('Mike', 45);
  t.is(getName(mike), 'Mike');
});
