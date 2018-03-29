// tslint:disable:no-expression-statement
import { test } from 'ava';
import { signature, type, TypedFunction } from './typed-function-decorators';

class Math extends TypedFunction {
  // The `signature` stores the method for later use in the static `create` function
  // In this case we are not tagging a method name
  // In many cases the signature can be infered from the TS types
  @signature()
  add_numbers(a: number, b: number) {
    return a + b;
  }

  @signature()
  add_strings(a: string, b: string) {
    return a + b;
  }

  // Here we are creating the `add` insatnce method which will be the typed-function for the two methods above
  // Since we added these two methods as signatures without a name
  // the function returned from `create` is anonymous
  // Notice the type for `add` is the intesection of `pow` and `repeat` instance methods
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
  // We can also pass the intesection type this way to teh `create` static method
  power = Math.create<Math['pow'] & Math['repeat']>('power');

  // Here we are using a single function for multiple types
  // These are TS overrides
  double_prim(a: string): string;
  double_prim(a: number): number;

  // Here we are "assigning" them to a function named 'double'.
  // Notice here we are defining each signiture, we cannot infer the type from an override method
  @signature('double', ['number'])
  @signature('double', ['string'])
  double_prim(a: any): any {
    return a + a;
  }

  @signature('double')
  double_array(a: Array<any>) {
    return a.concat(a);
  }

  // notice we don't create a `double` methods, it's not needed if we don't want it on these instances

  // signatures can also be protected
  @signature('sub')
  protected sub_numbers(a: number, b: number) {
    return a - b;
  }

  // or static
  @signature('sub')
  static sub_strings(a: string, b: string) {
    return a.split(b).join('');
  }

  // notice however the type definition is different for static methods
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
  // In addition TS is aware of the function signatures
  t.is(math.add(2, 3), 5);
  t.is(math.add('x', 'y'), 'xy');

  // this typed-function is unnamed
  t.is(math.add.name, '');
});

test('power', t => {
  t.is(math.power(2, 4), 16);
  t.is(math.power('2', 4), '2222');

  // this typed-function is named
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
  // here we are creating a type function like we do above
  // bot outside the class instances
  const double = Math.create<Math['double_prim'] & Math['double_array']>('double');
  t.is(double(2), 4);
  t.is(double('2'), '22');
  
  // this typed-function is names
  t.is(double.name, 'double');
});

test('can create function directly from the signatures', t => {
  // we can create type-functions directly, but notce the redundancy
  const double = Math.create<((z: string) => string) & ((z: number) => number)>('double', {
    'string | number': (a: any) => a + a
  });
  t.is(double(2), 4);
  t.is(double('2'), '22');
  
  // this typed-function is named
  t.is(double.name, 'double');
});

test('throws at runtime on bad signature', t => {
  t.throws(() => {
    math.power(2, '4' as any)
  });
});

test('compile time check', t => {
  // t.false(onlyAcceptsStrings(math.power(2, 4)));  // this won't pass TS
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

  // type definitions
  // by default use the property name as the type name
  @type()
  static WildAnimal(x: any): x is WildAnimal {
    return x && x instanceof WildAnimal && !(x instanceof Pet);
  }

  // here we specify the type name
  @type('Pet')
  static isPet(x: any): x is Pet {
    return x && x instanceof Pet;
  }
}

test('each class gets its own type api', t => {
  t.false((Pet as any).typed === (WildAnimal as any).typed);
});

test('added types', t => {
  const a = new WildAnimal('lizard');
  const b = new Pet('Rover');

  const sayMyName = Pet.create<typeof Pet.sayA & typeof Pet.sayB>();
  t.is(sayMyName(b), 'Hello Rover');
  t.is(sayMyName(a), 'Hello lizard');
});