# ts-typed-function

Typed-functions in TS using decorators

## Spec

```ts
// tslint:disable:no-expression-statement
import { test } from 'ava';
import { signature, type, TypedFunction } from './typed-function-decorators';

class Math extends TypedFunction {
  // The `signature` stores the method for later use in the createTypedMethod function
  // In this case we are not provding a name for the resulting method, "default" is assumed.
  // In many cases the type signature can be infered from the method types
  @signature()
  add_numbers(a: number, b: number) {
    return a + b;
  }

  @signature()
  add_strings(a: string, b: string) {
    return a + b;
  }

  // Here we are creating the `add` method wich will be the typed function for the two methods above
  // Since we added these two methods as signatures without a name
  // only the constructor is needed for the createTypedMethodfunction
  // the function returned from `createTypedMethod` is anonymous
  // Notice the type for `add` is the intesection of `pow` and `repeat`
  add: Math['add_numbers'] & Math['add_strings'] = Math.create();

  // Here we are defining a signature for the `power` function
  @signature('power')
  pow(a: number, b: number) {
    return a ** b;
  }

  // This will be combined with the signature above
  @signature('power')
  repeat(a: string, b: number) {
    return a.repeat(b);
  }

  // Here we are generating the 'power' function and adding it to the instance as `power`
  // We can also pass the intesection type this way
  power = Math.create<Math['pow'] & Math['repeat']>('power');

  // Here we are using a single function for multiple types
  // These are TS overrides
  double_prim(a: string): string;
  double_prim(a: number): number;

  // Here we are "assigning" them to a function named 'double'.
  // Notice here we are defining each signiture
  @signature('double', ['number'])
  @signature('double', ['string'])
  double_prim(a: any): any {
    return a + a;
  }

  @signature('double')
  double_array(a: Array<any>) {
    return a.concat(a);
  }

  // notice we don't create a `double` methods, it's not needed if we don't want it on the class

  // signatures can also be protected
  @signature('sub')
  protected sub_numbers(a: number, b: number) {
    return a - b;
  }

  // signatures can also be static
  @signature('sub')
  static sub_strings(a: string, b: string) {
    return a.split(b).join('');
  }

  // Notices however the type deinition is different for static methods
  sub: Math['sub_numbers'] & typeof Math.sub_strings = Math.create('sub');
}

let math: Math;

test.beforeEach(() => {
  math = new Math();
});

test('can create a instantiate a class with typed-functions', t => {
  t.true(math instanceof Math);
});

test('add', t => {
  // Calling the add function works
  // In addition TS provides the function signatures
  t.is(math.add(2, 3), 5);
  t.is(math.add('x', 'y'), 'xy');

  // this typed-function is unnamed
  t.is(math.add.name, '');
});

test('power', t => {
  t.is(math.power(2, 4), 16);
  t.is(math.power('2', 4), '2222');

  // this typed-function is name
  t.is(math.power.name, 'power');
});

test('sub', t => {
  // Calling the add function works
  // In addition TS provides the function signatures
  t.is(math.sub(5, 3), 2);
  t.is(math.sub('xyz', 'y'), 'xz');

  // this typed-function is named
  t.is(math.sub.name, 'sub');
});

test('can create function directly from existing signatures', t => {
  const double = Math.create<Math['double_prim'] & Math['double_array']>('double');
  t.is(double(2), 4);
  t.is(double('2'), '22');
  
  // this typed-function is name
  t.is(double.name, 'double');
});

test('can create function directly from new signatures', t => {
  const double = Math.create<((z: string) => string) & ((z: number) => number)>('double', {
    'string | number': (a: any) => a + a
  });
  t.is(double(2), 4);
  t.is(double('2'), '22');
  
  // this typed-function is name
  t.is(double.name, 'double');
});

test('throws at runtime on bad sig', t => {
  t.throws(() => {
    math.power(2, '4' as any)
  });
});

test('compile time check', t => {
  // t.false(onlyAcceptsStrings(math.power(2, 4)));
  t.true(onlyAcceptsStrings(math.power('2', 4)));

  function onlyAcceptsStrings(x: string) {
    return typeof x === 'string';
  }
});


class WildAnimal extends TypedFunction {
  constructor(public type: string) {
    super();
  }
}

class Pet extends WildAnimal {
  constructor(public name: string) {
    super('pet');
  }

  @signature()
  static sayA(x: WildAnimal) {
    return `Hello ${x.type}`;
  }

  @signature()
  static sayB(x: Pet) {
    return `Hello ${x.name}`;
  }

  // here we specify the type name
  @type('Pet')
  static isPet(x: any): x is Pet {
    return x && x instanceof Pet;
  }

  // type definitions
  // by default use the property name as the type name
  @type()
  static WildAnimal(x: any): x is WildAnimal {
    return x && x instanceof WildAnimal && !(x instanceof Pet);
  }
}

test('each class gets its own type api', t => {
  // we can test these, even though typescrips says they are private
  t.false((Pet as any).typed === (WildAnimal as any).typed);
});

test('added types', t => {
  const a = new WildAnimal('lizard');
  const b = new Pet('Rover');

  const sayMyName = Pet.create<typeof Pet.sayA & typeof Pet.sayB>();
  t.is(sayMyName(b), 'Hello Rover');
  t.is(sayMyName(a), 'Hello lizard');
});
```
