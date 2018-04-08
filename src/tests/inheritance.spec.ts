// tslint:disable:no-expression-statement member-ordering no-shadowed-variable
import { test } from 'ava';
import { signature, type, TypedFunction } from '../lib/typed-function-decorators';

test('signatures are inherited', t => {
  class A extends TypedFunction {
    @signature()
    number(x: number): string { return `the number ${x}`; }
  }

  class B extends A {
    @signature()
    string(x: string): string { return `the string "${x}"`; }
  }

  const a = A.create<A['number']>();
  const b = B.create<B['number'] & B['string']>();

  t.deepEqual(Object.keys((a as any).signatures), [
    'number',
  ]);

  t.deepEqual(Object.keys((b as any).signatures), [
    'number',
    'string'
  ]);

  t.is(a(42), 'the number 42');
  t.throws(() => (a as any)('everything'));
  t.is(b(42), 'the number 42');
  t.is(b('everything'), 'the string "everything"');
});

test('types are inherited', t => {
  interface Decimal {
    value: number;
  }

  class A extends TypedFunction {
    @type()
    isDecimal(x: any): x is Decimal { return x && typeof x.value === 'number'; }

    @signature()
    decimal(x: Decimal): string { return `the decimal ${x.value}`; }

    @signature()
    number(x: number): string { return `the number ${x}`; }
  }

  class B extends A {
    @signature()
    string(x: string): string { return `the string "${x}"`; }
  }

  class C extends TypedFunction {

  }

  const aTypes = (A as any).typed.types;
  const bTypes = (B as any).typed.types;
  const cTypes = (C as any).typed.types;

  t.is(aTypes[aTypes.length - 1].name, 'isDecimal');
  t.is(bTypes[bTypes.length - 1].name, 'isDecimal');
  t.is(cTypes[cTypes.length - 1].name, 'undefined');

  const a = A.create<A['decimal'] & A['number']>();
  const b = B.create<B['decimal'] & B['number'] & B['string']>();

  t.is(a(42), 'the number 42');
  t.is(a({value: 42}), 'the decimal 42');
  t.throws(() => (a as any)('everything'));
  t.is(b(42), 'the number 42');
  t.is(b({value: 42}), 'the decimal 42');
  t.is(b('everything'), 'the string "everything"');
});

test('avoids name collision', t => {
  const fn = (function() {
    class A {
      constructor(public value: number) {}
    }

    class Fn extends TypedFunction {
      @signature()
      number(x: number): number { return 2 * (x || 0); }
  
      @signature([A])
      a(x: A): number { return 4 * x.value; }
  
      @type(A)
      A(arg: any): arg is A {
        return arg instanceof A;
      }
    }

    return Fn.create<Fn['number'] & Fn['a']>();
  }());

  class A {
    constructor(public value: number) {}
  }

  const fn2 = (function() {
    class Fn2 extends TypedFunction {
      @signature()
      number(x: number): number { return 2 * (x || 0); }
  
      @signature([A])
      a(x: A): number { return 4 * x.value; }
  
      @type(A)
      A(arg: any): arg is A {
        return arg instanceof A;
      }
    }

    return Fn2.create<Fn2['number'] & Fn2['a']>();
  }());

  t.is(fn(15), 30);
  t.throws(() => fn(new A(10))); // why doesn't this fail in TS?

  t.is(fn2(15), 30);
  t.is(fn2(new A(10)), 40);
});
