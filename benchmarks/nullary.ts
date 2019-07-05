import * as assert from 'assert';
import * as suite from 'chuhai';

import { Typed, signature } from '../src';

class Fn {
  @signature()
  n(): string { 
    return `Hello World`;
  }
}

const tsTyped = new Typed();
const tsTypedFn = tsTyped.function(Fn);

const base = () => {
  return `Hello World`;
};

suite('calling a typed function', (s: any) => {
  const expected = `Hello World`;
  let result: string;

  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = base();
  });

  s.bench('ts-typed-function', () => {
    result = tsTypedFn();
  });
});
