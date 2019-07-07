import * as assert from 'assert';
import * as suite from 'chuhai';

import { String, Runtype, Static } from 'runtypes';

const base = (x: unknown): x is string => {
  return typeof x === 'string';
};

function createFromGuard<A extends Runtype>(guard: (x: unknown) => x is Static<A>, A: any) {
  A.guard = guard;
  return A;
}

// tslint:disable-next-line:variable-name
const StringType = createFromGuard(base, { tag: 'number' });

suite('calling a typed function', (s: any) => {
  const expected = [true, false];
  let result: boolean[];

  s.cycle(() => {
    assert.deepEqual(result, expected);
    result = null;
  });

  s.burn('burn in', () => {
    result = [base('hello'), base(42)];
  });

  s.bench('runtype String.guard', () => {
    result = [String.guard('hello'), String.guard(42)];
  });

  s.bench('createFromGuard String.guard', () => {
    result = [String.guard('hello'), StringType.guard(42)];
  });
});
