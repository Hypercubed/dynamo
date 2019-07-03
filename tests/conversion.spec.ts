import test from 'ava';
import { Typed, signature, conversion, guard, Any } from '../src/';

const typed = new Typed();

class BoxedValue {
  @guard()
  static isBoxedValue(x: any): x is BoxedValue {
    return x instanceof BoxedValue;
  }

  @conversion()
  static fromBoolean(x: boolean): BoxedValue {
    return new BoxedValue(x, 'boolean');
  }

  @conversion()
  static fromNumber(x: number): BoxedValue {
    return new BoxedValue(x, 'number');
  }

  constructor(private value: any, private kind: string) {}

  inspect() {
    return `boxed value ${this.value} is a ${this.kind}`;
  }
}

typed.add(BoxedValue);

class Fn1 {
  @signature()
  str(a: string): string {
    return `unboxed value ${a} is a string`;
  }

  box(a: number | boolean | BoxedValue): string;

  @signature(BoxedValue)
  box(a: any): string {
    return a.inspect();
  }

  @signature(Any)
  other(a: any): string {
    return `value unknown`;
  }
}

test('calling the function works', t => {
  const fn = typed.function(Fn1);

  t.is(fn(true), `boxed value true is a boolean`);
  t.is(fn(3), `boxed value 3 is a number`);
  t.is(fn('Y'), `unboxed value Y is a string`);
});
