import test from 'ava';
import { Typed, signature, guard } from '../src';
import { assert, IsExact } from 'conditional-type-checks';

const typed = new Typed();

function convertGuard<T extends unknown>(_guard: Guard<T>, name?: string): Constructor<T> {
  _guard['guard'] = _guard;
  guard()(_guard, 'guard');
  Object.defineProperty(_guard, 'name', { value: name });
  return _guard as any;
}

// tslint:disable-next-line:variable-name
const Name = convertGuard<string>((x: unknown) => typeof x === 'string' && x.length > 0);
type Name = InstanceType<typeof Name>;

// tslint:disable-next-line:variable-name
const Age = convertGuard<number>((n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0);
type Age = InstanceType<typeof Age>;

interface Person {
  name: Name;
  age: Age;
  kind: '$person';
}

typed.add(Name, Age);

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
  }, 'No alternatives were matched');

  t.throws(() => {
    createPerson('', 45);
  }, 'No alternatives were matched');

  t.throws(() => {
    createPerson('Mike', -1.2);
  }, 'No alternatives were matched');

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
  }, 'No alternatives were matched');

  /* t.throws(() => {
    // @ts-ignore
    getName({ name: 'Mike', age: 45 });
  }, 'No alternatives were matched'); */

  const mike = createPerson('Mike', 45);
  t.is(getName(mike), 'Mike');
});
