import test from 'ava';
import { Typed, signature, guard } from '../src';
import { assert, IsExact } from 'conditional-type-checks';

const typed = new Typed();

function convertGuard<T extends unknown>(_guard: Is<T>, name?: string): Constructor<T> {
  _guard['guard'] = _guard;
  guard()(_guard, 'guard');
  Object.defineProperty(_guard, 'name', { value: name });
  return _guard as any;
}

// tslint:disable-next-line:variable-name
const Name = convertGuard<string>((x: unknown) => typeof x === 'string' && x.length > 0, 'Name');
type Name = InstanceType<typeof Name>;

// tslint:disable-next-line:variable-name
const Age = convertGuard<number>((n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0, 'Age');
type Age = InstanceType<typeof Age>;

interface IPerson {
  name: Name;
  age: Age;
  kind: '$person';
}

class PersonGuard {
  @guard()
  static isPerson(x: unknown): x is IPerson {
    return typeof x === 'object' && 'name' in x && 'age' in x;
  }
}

// tslint:disable-next-line:variable-name
const Person = PersonGuard;
type Person = IPerson;

typed.add(Person, Name, Age);

class CreatePerson {
  @signature()
  person(name: Name, age: Age): Person {
    return { name, age, kind: '$person' };
  }
}

const createPerson = typed.function(CreatePerson);

test('types are correct', t => {
  assert<IsExact<Age, number>>(true);
  assert<IsExact<Name, string>>(true);
  t.pass();
});

test('example', t => {
  assert<IsExact<typeof createPerson, (name: Name, age: Age) => Person>>(true);

  t.throws(() => {
    // @ts-ignore
    createPerson(45, 45);
  }, 'Unexpected type of arguments. Expected [Name,Age].');

  t.throws(() => {
    createPerson('', 45);
  }, 'Unexpected type of arguments. Expected [Name,Age].');

  t.throws(() => {
    createPerson('Mike', -1.2);
  }, 'Unexpected type of arguments. Expected [Name,Age].');

  const mike = createPerson('Mike', 45);

  assert<IsExact<typeof mike, Person>>(true);
  t.deepEqual(mike, { name: 'Mike', age: 45, kind: '$person' });    // ok
});

class GetName {
  @signature()
  getName(person: Person): Name {
    return person.name;
  }
}

const getName = typed.function(GetName);

test('getName', t => {
  assert<IsExact<typeof getName, (person: Person) => Name>>(true);

  t.throws(() => {
    // @ts-ignore
    getName(45);
  }, 'Unexpected type of arguments. Expected [PersonGuard].');

  t.throws(() => {
    // @ts-ignore
    getName({ nombre: 'Mike', años: 45 });
  }, 'Unexpected type of arguments. Expected [PersonGuard].');

  const mike = createPerson('Mike', 45);
  t.is(getName(mike), 'Mike');
});
