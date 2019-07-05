import test from 'ava';
import { signature, Typed, guard, conversion } from '../src';

const typed = new Typed();

class BigIntDefinition {
  @guard(BigInt)
  static isBigInt(a: any): a is bigint {
    return typeof a === 'bigint';
  }

  @conversion()
  static fromNumber(a: number): bigint {
    return BigInt(a);
  }
}

class Complex {
  @guard()
  static isComplex(a: any): a is Complex {
    return a instanceof Complex;
  }

  @conversion()
  static fromNumber(a: number): Complex {
    return new Complex(BigInt(a), 0n);
  }

  @conversion()
  static fromBigInt(a: bigint): Complex {
    return new Complex(a, 0n);
  }

  constructor(public re: bigint, public im: bigint) {}

  times(b: Complex) {
    return new Complex(this.re * b.re - this.im * b.im, this.re * b.im + this.re * b.im);
  }
}

class Times {
  name: 'times';

  @signature()
  btimes(a: boolean, b: boolean): boolean {
    return a && b;
  }

  ntimes(a: number | bigint, b: number | bigint): number | bigint;

  @signature()
  @signature(BigInt, BigInt)
  ntimes(a: number, b: number): number {
    return a * b;
  }

  times(a: number | bigint | Complex, b: number | bigint | Complex): number | bigint | Complex;

  @signature()
  times(a: Complex, b: Complex): Complex {
    return a.times(b);
  }
}

typed.add(BigIntDefinition, Complex);

const times = typed.function(Times);

test('no conversion', t => {
  t.is(times(true, false), false);
  t.is(times(3, 6), 18);
  t.is(times(3n, 6n), 18n);
  t.deepEqual(times(new Complex(3n, 0n), new Complex(6n, 0n)), new Complex(18n, 0n));
});

test.skip('conversion', t => {
  t.is(times(3n, 6), 18n);      // 6 is upconverted to a bigint
  t.deepEqual(times(new Complex(3n, 0n), 6), new Complex(18n, 0n));   // 6 is upconverted to a complex
  t.deepEqual(times(new Complex(3n, 0n), 6n), new Complex(18n, 0n));   // 6n is converted to a complex
});

test('errors', t => {
  t.throws(() => {
    t.is(times(3, '6' as any), 18);   // Typescript doesn't allow boolean times string
  }, 'No alternatives were matched');
  t.throws(() => {
    t.is(times(true as any, 6), 18);  // Typescript doesn't allow boolean times number
  }, 'No alternatives were matched');
});
