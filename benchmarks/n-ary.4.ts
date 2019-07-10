import * as assert from 'assert';
import * as suite from 'chuhai';

import * as typed from 'typed-function';
import { Typed, signature } from '../src';

const obj = {
  'number, string': (a: number, b: string) => `number, string`,
  'string, number': (a: string, b: number) => `string, number`,
  'string, number, boolean': (a: string, b: number, c: boolean): string => `string, number, boolean`,
  boolean: (a: boolean) => 'boolean'
}

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

const tsTyped = new Typed();
const tsTypedFn = tsTyped.function(Fn);

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

result = input.map(a => base.apply(null, a));

suite('n-ary function, four overides', (s: any) => {
  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = input.map(a => base.apply(null, a));
  });

  s.bench('ts-typed-function', () => {
    result = input.map(a => tsTypedFn.apply(null, a));
  });

  s.bench('typed-function', () => {
    result = input.map(a => typedFn.apply(null, a));
  });
});
