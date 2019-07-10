import * as assert from 'assert';
import * as suite from 'chuhai';

import * as typed from 'typed-function';
import { Typed, signature } from '../src';

const I = (a: any) => a;

const typedFn = typed({
  number: (a: number) => `the number ${a}`,
  string: (a: string) => `the string ${a}`,
});

class Fn {
  @signature()
  n(a: number): string { 
    return `the number ${a}`;
  }

  @signature()
  s(a: string): string { 
    return `the string ${a}`;
  }
}

const tsTyped = new Typed();
const tsTypedFn = tsTyped.function(Fn);

const base = (a: number | string) => {
  if (typeof a === 'number') {
    return `the number ${a}`;
  }
  if (typeof a === 'string') {
    return `the string ${a}`;
  }
  throw new TypeError('TypeError');
};

suite('unary function, one overides', (s: any) => {
  const input: [string, number] = ['Hello', 42];
  const expected = ['the string Hello', 'the number 42'];
  let result: string[];

  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = [
      base(input[0]),
      base(input[1])
    ];
  });

  s.bench('ts-typed-function', () => {
    result = [
      tsTypedFn(input[0]),
      tsTypedFn(input[1])
    ];
  });

  s.bench('typed-function', () => {
    result = [
      typedFn(input[0]),
      typedFn(input[1])
    ];
  });
});
