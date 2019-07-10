import * as assert from 'assert';
import * as suite from 'chuhai';

import * as typed from 'typed-function';
import { Typed, signature } from '../src';

const I = (a: any) => a;

const typedFn = typed({
  'number, string': (a: number, b: string) => `number, string`,
  'string, number': (a: string, b: number) => `string, number`,
});

class Fn {
  @signature()
  n(a: number, b: string): string { 
    return `number, string`;
  }

  @signature()
  s(a: string, b: number): string { 
    return `string, number`;
  }
}

const tsTyped = new Typed();
const tsTypedFn = tsTyped.function(Fn);

const base = (a: number | string, b: number | string) => {
  if (typeof a === 'number' && typeof b === 'string') {
    return `number, string`;
  }
  if (typeof a === 'string' && typeof b === 'number') {
    return `string, number`;
  }
  throw new TypeError('TypeError');
};

const input: any = [['Hello', 42], [42, 'Hello']];
const expected = [ 'string, number', 'number, string'];
let result: string[];

suite('binary function, two overides', (s: any) => {

  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = [
      base(input[0][0], input[0][1]),
      base(input[1][0], input[1][1])
    ];
  });

  s.bench('ts-typed-function', () => {
    result = [
      tsTypedFn(input[0][0], input[0][1]),
      tsTypedFn(input[1][0], input[1][1])
    ];
  });

  s.bench('typed-function', () => {
    result = [
      typedFn(input[0][0], input[0][1]),
      typedFn(input[1][0], input[1][1])
    ];
  });
});
