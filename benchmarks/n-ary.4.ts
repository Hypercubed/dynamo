import * as assert from 'assert';
import * as suite from 'chuhai';

import * as typed from 'typed-function';
import Overload from 'function-overloader';
import { Dynamo, signature } from '../src';

const polymorphic = require('polymorphic');
const poly = polymorphic();

const obj = {
  'number, string': (a: number, b: string) => `number, string`,
  'string, number': (a: string, b: number) => `string, number`,
  'string, number, boolean': (a: string, b: number, c: boolean): string => `string, number, boolean`,
  boolean: (a: boolean) => 'boolean'
};

poly.signature('number, string', obj['number, string']);
poly.signature('string, number', obj['string, number']);
poly.signature('string, number, boolean', obj['string, number, boolean']);
poly.signature('boolean', obj['boolean']);

const typedFn = typed(obj);

class Fn {
  @signature(Number, String)
  a = obj['number, string'];

  @signature(String, Number)
  b = obj['string, number'];

  @signature(String, Number, Boolean)
  c = obj['string, number, boolean'];

  @signature(Boolean)
  d = obj['boolean'];
}

const dynamo = new Dynamo();
const dynamoFn = dynamo.function(Fn);

function overload() {
  return Overload
    .when(Overload.NUMBER, Overload.STRING)
    .do(obj['number, string'])
    .when(Overload.STRING, Overload.NUMBER)
    .do(obj['string, number'])
    .when(Overload.STRING, Overload.NUMBER, Overload.BOOLEAN)
    .do(obj['string, number, boolean'])
    .when(Overload.BOOLEAN)
    .do(obj['boolean'])
    .execute(...arguments);
}

const base = (a: number | string | boolean, b?: number | string, c?: boolean) => {
  if (typeof a === 'number' && typeof b === 'string' && typeof c === 'undefined') {
    return `number, string`;
  }
  if (typeof a === 'string' && typeof b === 'number' && typeof c === 'undefined') {
    return `string, number`;
  }
  if (typeof a === 'string' && typeof b === 'number' &&  typeof c === 'boolean') {
    return `string, number, boolean`;
  }
  if (typeof a === 'boolean' && typeof b === 'undefined' && typeof c === 'undefined') {
    return `boolean`;
  }
  throw new TypeError('TypeError');
};

const input: any = [['Hello', 42], [42, 'Hello'], ['Hello', 42, true], [false]];
const expected = [ 'string, number', 'number, string', 'string, number, boolean', 'boolean'];
let result: string[];

suite('n-ary function, four overides', (s: any) => {
  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = input.map(a => base.apply(null, a));
  });

  s.bench('dynamo function', () => {
    result = input.map(a => dynamoFn.apply(null, a));
  });

  s.bench('overload', () => {
    result = input.map(a => overload.apply(null, a));
  });

  s.bench('typed-function', () => {
    result = input.map(a => typedFn.apply(null, a));
  });

  s.bench('polymorphic', () => {
    result = input.map(a => poly.apply(null, a));
  });
});
