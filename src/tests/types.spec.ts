// tslint:disable:no-expression-statement member-ordering no-shadowed-variable
import { test } from 'ava';
import { signature, type, TypedFunction } from '../lib/typed-function-decorators';

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

  // type definitions should happend before signature
  // by default use the property name as the type name (is{ConstructorName})
  @type()
  static isPet(x: any): x is Pet {
    return x && x instanceof Pet;
  }

  // here we specify the type explicity
  @type(WildAnimal)
  static isWild(x: any): x is WildAnimal {
    return x && x instanceof WildAnimal && !(x instanceof Pet);
  }

  @signature()
  static sayA(x: WildAnimal) {
    return `Hello ${x.type}`;
  }

  @signature()
  static sayB(x: Pet) {
    return `Hello ${x.name}`;
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

test('explicit types', t => {
  class A {

  }
  class Fn extends TypedFunction {
    @signature(['number | string'])
    num(a: number | string): any { return +a; }
  
    @signature()
    val(a: A): any { return a.valueOf(); }

    @type(A)
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
    'isA'
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
    'isA'
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

test('use class in signature', t => {
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

  const fn = Fn.create<Fn['number'] & Fn['a']>();

  t.is(fn(15), 30);
  t.is(fn(new A(10)), 40);
});
