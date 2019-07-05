import test from 'ava';
import { Typed, guard } from '../src/';

let typed: Typed;
test.beforeEach(() => {
  typed = new Typed();
});

class Person {
  @guard()
  static isPerson(p: any): p is Person {
    return p instanceof Person;
  }

  constructor(public name: string, public age: number) {
  }
}

test.skip('starts with basic definitions', t => {
  // @ts-ignore
  const types = typed._typed.types.map((x: any) => x.name);

  t.deepEqual(types, [
    'number',
    'string',
    'boolean',
    'Function',
    'Array',
    'Date',
    'RegExp',
    'Object',
    'null',
    'undefined',
  ]);
});

test.skip('create inherits types', t => {
  /* typed.add(Person);

  const typed2 = typed.create();

  // @ts-ignore
  const types = typed2._typed.types.map((x: any) => x.name);

  t.deepEqual(types, [
    'number',
    'string',
    'boolean',
    'Function',
    'Array',
    'Date',
    'RegExp',
    'Object',
    'null',
    'undefined',
    'Person$0'
  ]); */
});
