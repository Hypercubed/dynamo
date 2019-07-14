import * as assert from 'assert';
import * as suite from 'chuhai';

import { Dynamo, signature } from '../src';

class Fn {
  @signature()
  n(): string { 
    return `Hello World`;
  }
}

const dynamo = new Dynamo();
const dynamoFn = dynamo.function(Fn);

const base = () => {
  return `Hello World`;
};

suite('nullary', (s: any) => {
  const expected = `Hello World`;
  let result: string;

  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = base();
  });

  s.bench('dynamo function', () => {
    result = dynamoFn();
  });
});
