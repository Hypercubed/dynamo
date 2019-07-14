import test from 'ava';
import { assert, IsExact, Has } from 'conditional-type-checks';

import { Dynamo, signature } from '../src';

const dynamo = new Dynamo();

class DoublePrim {
  name = 'double';

  // Here we are using a single function for multiple types
  // These are TypeScript overrides
  double_prim(a: string): string;
  double_prim(a: number): number;

  // Here we are "assigning" them to a function named 'double'.
  // Notice here we are defining each signature, we cannot infer the type from an override method
  @signature(Number)
  @signature(String)
  double_prim(a: any): any {
    return a + a;
  }

  @signature()
  double_array(a: any[]): any[] {
    return a.concat(a);
  }
}

const double = dynamo.function(DoublePrim);

test('has the correct signature', t => {
  assert<Has<typeof double, ((a: number) => number)>>(true);
  assert<Has<typeof double, ((a: string) => string)>>(true);
  assert<Has<typeof double, ((a: any[]) => any[])>>(true);

  assert<Has<typeof double, ((a: number) => string)>>(false);
  assert<Has<typeof double, ((a: string) => number)>>(false);
  assert<Has<typeof double, ((a: any[]) => [any])>>(false);

  t.is(double.name, 'double');
  t.is(double.length, 1);
});

test('can create function given types', t => {
  t.is(double(2), 4);
  t.is(double('2'), '22');
  t.deepEqual(double(['2']), ['2', '2']);
});
