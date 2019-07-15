import test from 'ava';

import { signature, Dynamo, guard } from '../src';
import { AnyMxRecord } from 'dns';

const dynamo = new Dynamo({ types: false });

function StringLiteral<T>(name: T) {
  class Type extends String {
    @guard()
    static is(x: unknown): x is Type {
      return x === name;
    }

    name: T = name;
  }
  Object.defineProperty(Type, 'name', { value: `"${name}"` });
  return Type;
}

// tslint:disable-next-line: variable-name
const LiteralA = StringLiteral('A');
type LiteralA = 'A';

// tslint:disable-next-line: variable-name
const LiteralB = StringLiteral('B');
type LiteralB = 'B';

dynamo.add(LiteralA, LiteralB);

class Match {
  @signature()
  matchA(x: LiteralA): string {
    return `x is A`;
  }

  @signature()
  matchB(x: LiteralB): string {
    return `x is B`;
  }
}

const match = dynamo.function(Match);

test('literals', t => {
  t.is(match('A'), 'x is A');
  t.is(match('B'), 'x is B');
  
  t.throws(() => {
    // @ts-ignore
    t.is(match('C'), 'x is B');
  }, 'Unexpected type of arguments. Expected ["A"] or ["B"].');
});
