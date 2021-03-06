import * as assert from 'assert';
import * as suite from 'chuhai';

import * as typed from 'typed-function';
import { Dynamo, signature } from '../src';

const I = (a: any) => a;

const typedFn = typed({
  number: (a: number) => `the number ${a}`
});

class Fn {
  @signature()
  n(a: number): string { 
    return `the number ${a}`;
  }
}

const dynamo = new Dynamo();
const dynamoFn = dynamo.function(Fn);

const base = (a: number) => {
  if (typeof a === 'number') {
    return `the number ${a}`;
  }
  throw new TypeError('TypeError');
};

suite('unary function, one overides', (s: any) => {
  const input = 42;
  const expected = 'the number 42';
  let result: string;

  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = base(input);
  });

  s.bench('dynamo function', () => {
    result = dynamoFn(input);
  });

  s.bench('typed-function', () => {
    result = typedFn(input);
  });
});
