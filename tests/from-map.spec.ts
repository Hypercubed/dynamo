// tslint:disable:no-expression-statement member-ordering no-shadowed-variable
import test from 'ava';
import { Typed } from '../src/lib/typed-function';

const typed = new Typed();

const add = typed.fromMap('Add', {
  'number, number': (a: number, b: number) => {
    return a + b;
  },
  'string, string': (a: string, b: string) => {
    return a + b;
  }
});

test('calling the function works', t => {
  t.is(add(2, 3), 5);
  t.is(add('x', 'y'), 'xy');
});

test('has the correct signature', t => {
  t.is(add.name, 'Add');
  t.is(add.length, 2);
});
