// tslint:disable:no-expression-statement member-ordering
import { test } from 'ava';
import { signature, type, TypedFunction } from './typed-function-decorators';

class MyMath extends TypedFunction {
  // The `signature` stores the method for later use in the static `create` function
  // In this case we are not tagging a method name
  // In many cases the signature can be inferred from the TS types
  @signature()
  add_numbers(a: number, b: number) {
    return a + b;
  }

  @signature()
  add_strings(a: string, b: string) {
    return a + b;
  }

  // Here we are creating the `add` instance method which will be the typed-function for the two methods above
  // Since we added these two methods as signatures without a name
  // the function returned from `create` is anonymous
  // Notice the type for `add` is the intersection of `pow` and `repeat` instance methods
  add: MyMath['add_numbers'] & MyMath['add_strings'] = MyMath.create();

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
  // We can also pass the intersection type this way to teh `create` static method
  power = MyMath.create<MyMath['pow'] & MyMath['repeat']>('power');

  // Here we are using a single function for multiple types
  // These are TS overrides
  double_prim(a: string): string;
  double_prim(a: number): number;

  // Here we are "assigning" them to a function named 'double'.
  // Notice here we are defining each signature, we cannot infer the type from an override method
  @signature('double', ['number'])
  @signature('double', ['string'])
  double_prim(a: any): any {
    return a + a;
  }

  @signature('double')
  double_array(a: any[]) {
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
  sub: MyMath['sub_numbers'] & typeof MyMath.sub_strings = MyMath.create('sub');
}

let math: MyMath;

test.beforeEach(() => {
  math = new MyMath();
});

test('can create a instantiate a class with typed-functions', t => {
  t.true(math instanceof MyMath);
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
  const double = MyMath.create<MyMath['double_prim'] & MyMath['double_array']>('double');
  t.is(double(2), 4);
  t.is(double('2'), '22');
  
  // this typed-function is names
  t.is(double.name, 'double');
});

test('can create function directly from the signatures', t => {
  // we can create type-functions directly, but notice the redundancy
  const double = MyMath.create<((z: string) => string) & ((z: number) => number)>('double', {
    'string | number': (a: any) => a + a
  });
  t.is(double(2), 4);
  t.is(double('2'), '22');
  
  // this typed-function is named
  t.is(double.name, 'double');
});

test('throws at runtime on bad signature', t => {
  t.throws(() => {
    math.power(2, '4' as any);
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
  // tslint:disable-next-line:no-shadowed-variable
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

test('readme basic example', t => {
  class Fish {
    constructor(public name: string) {}
  }

  class Fn extends TypedFunction {
    @signature()
    num(a: number, b: boolean) {
      return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
    }
  
    @signature()
    str(a: string) {
      return `a is "${a}"`;
    }

    @signature()
    fish(a: Fish) {
      return `a is a fish named ${a.name}`;
    }
  
    @type('Fish')
    isFish(a: any): a is Fish {
      return a instanceof Fish;
    }
  }
  
  const fn = Fn.create<Fn['num'] & Fn['str'] & Fn['fish']>();

  t.is(typeof fn, 'function');
  t.is(fn(15, true), 'a is the number 15, b is TRUE');
  t.is(fn('hello'), 'a is "hello"');
  t.is(fn(new Fish('wanda')), 'a is a fish named wanda');

  try {
    (fn as any)(42, 'false');
  } catch (err) {
    t.is(
      err.toString(),
      'TypeError: Unexpected type of argument in function unnamed (expected: boolean, actual: string, index: 1)'
    );
  }

  t.is(fn.name, '');
});

test('readme named example', t => {
  class Fn extends TypedFunction {
    @signature('double')
    double(a: string) {
      return a + a;
    }
  
    @signature('double')
    twice(a: number) {
      return 2 * a;
    }

    @signature('power')
    pow(a: number, b: number) {
      return a ** b;
    }
  
    // This will be combined with the signature above
    @signature('repeat')
    @signature('power')
    repeat(a: string, b: number) {
      return a.repeat(b);
    }
  }
  
  const double = Fn.create<Fn['double'] & Fn['twice']>('double');
  const power = Fn.create<Fn['pow'] & Fn['repeat']>('power');
  const repeat = Fn.create<Fn['repeat']>('repeat');

  t.is(typeof double, 'function');
  t.is(double.name, 'double');

  t.is(typeof power, 'function');
  t.is(power.name, 'power');

  t.is(typeof repeat, 'function');
  t.is(repeat.name, 'repeat');

  t.is(double(15), 30);
  t.is(double('boo'), 'booboo');

  t.is(power(2, 3), 8);
  t.is(power('boo', 3), 'boobooboo');

  t.is(repeat('boo', 3), 'boobooboo');
});

test('readme override example', t => {
  class Fn extends TypedFunction {
    double(a: string): string;
    double(a: number): number;
  
    @signature('double', ['string'])
    @signature('double', ['number'])
    double(a: any): any {
      return a + a;
    }
  }
  
  const double = Fn.create<Fn['double']>('double');

  t.is(typeof double, 'function');
  t.is(double.name, 'double');

  t.is(double(15), 30);
  t.is(double('boo'), 'booboo');
});

test('explicit types', t => {
  class A {

  }
  class Fn extends TypedFunction {
    @signature(['number | string'])
    num(a: number | string): any { return +a; }
  
    @signature()
    val(a: A): any { return a.valueOf(); }

    @type()
    A(a: any): a is A {
      return a instanceof A;
    }
  }

  const fn = Fn.create<Fn['num'] & Fn['val']>();

  t.is(typeof fn, 'function');
  t.is(fn.name, '');

  t.deepEqual(Object.keys((fn as any).signatures), [
    'number',
    'string',
    'A'
  ]);
});

test('all types', t => {
  enum D {
    Up,
    Down,
    Left,
    Right,
  }

  class A {

  }

  class Fn extends TypedFunction {
    @signature()
    number(a: number): any { return a; }

    @signature()
    string(a: string): any { return a; }

    @signature()
    boolean(a: boolean): any { return a; }

    @signature()
    any(a: any): any { return a; }

    @signature()
    array(a: any[]): any { return a; }

    @signature()
    d(a: D): any { return a; }

    @signature()
    function(a: () => any): any { return a; }

    @signature()
    a(a: A): any { return a; }

    @signature()
    date(a: Date): any { return a; }

    @signature()
    regexp(a: RegExp): any { return a; }

    @signature()
    undef(a: undefined): any { return a; }

    @type('A')
    isA(a: any): boolean { return a instanceof A; }

    @signature('union', ['number | string'])
    union(a: number | string): any { return a; }

    @signature('constant')
    constant(a: 'Constant'): any { return a; }

    @signature('nullable')
    nullable(a?: any): any { return a; }
  }

  const x = Fn.create();
  const union = Fn.create('union');
  const constant = Fn.create('constant');
  const nullable = Fn.create('nullable');

  t.deepEqual(Object.keys((x as any).signatures), [
    'number',
    'string',
    'boolean',
    'Function',
    'Array',
    'Date',
    'RegExp',
    'Object',
    'undefined',
    'A'
  ]);

  t.deepEqual(Object.keys((union as any).signatures), [
    'number',
    'string'
  ]);

  t.deepEqual(Object.keys((constant as any).signatures), [
    'string'
  ]);

  t.deepEqual(Object.keys((nullable as any).signatures), [
    'Object'
  ]);
});

test('instance', t => {
  class FishFood {
    constructor(public name: string) {}
  }

  class Fish extends TypedFunction {
    constructor(public name: string) {
      super();
    }

    @signature()
    protected eatFood(a: FishFood): string {
      return `Yum, ${a.name}!`;
    }

    @signature()
    protected eatFish(a: Fish): string {
      return `No way, I won't eat ${a.name}`;
    }

    @type('Fish')
    static isFish(a: any): a is Fish {
      return a instanceof Fish;
    }

    @type('FishFood')
    protected isFishFood(a: any): a is FishFood {
      return a instanceof FishFood;
    }

    eat = Fish.create<Fish['eatFood'] & Fish['eatFish']>(); 
  }

  const f = new Fish('Wanda');
  
  t.is(typeof f.eat, 'function');
  t.is(f.eat(new FishFood('worms')), 'Yum, worms!');
  t.is(f.eat(new Fish('Nemo')), 'No way, I won\'t eat Nemo');

  t.is(f.eat.name, '');
});

test('undefined / null types', t => {
  class Fn extends TypedFunction {
    @signature()
    number(a?: number): any { return 2 * (a || 0); }

    @signature()
    unknown(_: undefined): any { return 'unknown'; }

    @signature(['null'])
    nil(_: null): any { return 'nil'; }
  }

  const fn = Fn.create<Fn['number'] & Fn['unknown'] & Fn['nil']>();

  t.is(fn(15), 30);
  t.is(fn(undefined), 'unknown');
  t.is(fn(null), 'nil');
});
