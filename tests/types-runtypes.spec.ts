import test from 'ava';
import { Typed, signature, guard } from '../src';
import { Number as NumberType, String as StringType, Static, Record, Runtype, Constraint, Literal } from 'runtypes';
import { assert, IsExact } from 'conditional-type-checks';

interface ConstraintToken<V> extends Constraint<any> {
  name: string;
  new(...args: any[]): V;
}

function convertConstraint<T extends Runtype<unknown>>(constraint: T, name?: string): ConstraintToken<Static<T>> {
  constraint['name'] = name ? `${name} ${constraint['tag']}` : constraint['tag'];
  guard()(constraint, 'guard');
  return constraint as any;
}

const typed = new Typed();

const nameConstraint = StringType.withConstraint(x => {
  return x.length > 0;
});

// tslint:disable-next-line:variable-name
const Name = convertConstraint(nameConstraint);
type Name = InstanceType<typeof Name>;

const ageConstraint = NumberType.withConstraint(n => {
  return Number.isInteger(n) && n >= 0;
});

// tslint:disable-next-line:variable-name
const Age = convertConstraint(ageConstraint);
type Age = InstanceType<typeof Age>;

const personRecord = Record({
  name: nameConstraint,
  age: ageConstraint,
  kind: Literal('$person')
});
// tslint:disable-next-line:variable-name
const Person = convertConstraint(personRecord);
type Person = Static<typeof personRecord>;

typed.add(Name, Age, Person);

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
  }, 'Unexpected type of arguments. Expected [constraint,constraint].');

  t.throws(() => {
    createPerson('', 45);
  }, 'Unexpected type of arguments. Expected [constraint,constraint].');

  t.throws(() => {
    createPerson('Mike', -1.2);
  }, 'Unexpected type of arguments. Expected [constraint,constraint].');

  t.deepEqual(createPerson('Mike', 45), { name: 'Mike', age: 45, kind: '$person' });    // ok
});

class GetName {
  @signature()
  getName(p: Person): Name {
    return p.name;
  }
}

const getName = typed.function(GetName);

test('getName', t => {
  assert<IsExact<typeof getName, (person: Person) => Name>>(true);

  t.throws(() => {
    // @ts-ignore
    getName(45);
  }, 'Unexpected type of arguments. Expected [record].');

  t.throws(() => {
    // @ts-ignore
    getName({ name: 'Mike', age: 45 });
  }, 'Unexpected type of arguments. Expected [record].');

  const mike = createPerson('Mike', 45);
  t.is(getName(mike), 'Mike');
});
