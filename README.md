# ts-typed-function

Typed-functions in TS using decorators

## Introduction

[josdejong/typed-function](https://github.com/josdejong/typed-function) provides a flexible and organized way to do run-time type checking in JavaScript.  `ts-typed-function` is an experimental TypeScript wrapper on top of `typed-function`.

`typed-function` has the following features:

* Runtime type-checking of input arguments.
* Automatic type conversion of arguments.
* Compose typed functions with multiple signatures.
* Supports union types, any type, and variable arguments.
* Detailed error messaging.

`ts-typed-function` adds the following:

* Input arguments inferred from TypeScript types.
* Type tests for classes inferred
* Appropriate type signatures for typed functions.

## TLDR Usage

(because nobody reads past the first example)

```ts
import { signature, type } from './ts-typed-function';

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
}

const fn = Fn.create<Fn['num'] & Fn['str'] & Fn['fish']>();

// use the functions
console.log(fn(42, true));            // outputs 'a is the number 42, b is TRUE'
console.log(fn('everything'));        // outputs 'a is "everything"'
console.log(fn(new Fish('wanda'))));  // outputs 'a is a fish named wanda'
 
try {
  // fn('hello', 'world');       // This will not pass the TS compiler
  (fn as any)(42, 'everything'); // This will throw at run-time
}
catch (err) {
  console.log(err.toString());
  // outputs:  TypeError: Unexpected type of argument in function unnamed
  // (expected: boolean, actual: string, index: 1)
}
```

## Usage Explanation

### `typed-function` without TypeScript

```js
const typed = require('typed-function');

typed.addType('Fish', function(a) {
  return a instanceof Fish;
});

// create a typed function
const fn = typed({
  'number, boolean': function (a, b) {
    return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
  },
  'string': function (a, b) {
    return `a is "${a}"`;
  },
  'Fish': function (a) {
    return `a is a fish named ${a.name}`;
  }
});
```

Here we have created a function that takes as input a number and a boolean or a string and a boolean.  Calling the function with any other parameter types as input will throw a runtime error.

### `typed-function` with TypeScript

Doing the same in TypeScript is similar:

```ts
import { default as typed } from 'typed-function';

typed.addType('Fish', function(a: any): a is Fish {
  return a instanceof Fish;
});

const fn = typed({
  'number, boolean': function (a: number, b: boolean) {
    return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
  },
  'string': function (a: string, b: boolean) {
    return `a is "${a}"`;
  },
  'Fish': function (a: Fish) {
    return `a is a fish named ${a.name}`;
  }
});
```

The resulting function has the same runtime behavior.  However, we notice two issues:

1) The input parameter types are redundantly defined, once for TypeScript and once for `typed-function`.
2) The resulting function `fn` has a TypeScript type of `any`, and therefore provides no type safety.
3) We must explicitly add the obvious type check of `instanceof Fish`.

Issue #2 can be solved by typing the resulting function:

```ts
const signatures = {
  'number, boolean': function (a: number, b: boolean) {
    return 'a is a number, b is a boolean';
  },
  'string': function (a: string, b: boolean) {
    return 'a is a string, b is a number';
  },
  'Fish': function (a: Fish) {
    return `a is a fish named ${a.name}`;
  }
};

const fn: typeof signatures['number, boolean'] & typeof signatures['string'] & typeof signatures['Fish'] = typed(fnSignatures);
```

Notice we are first defining the signatures object, then using the types of the these signatures to define the type of the typed-function. This is much better in terms of type safety but adds even more redundancy and not a great developer experience.

### `ts-typed-function`

`ts-typed-function` uses classes and method decorators to improve the developer experience:

```ts
import { signature, type } from './ts-typed-function';

class Fn extends TypedFunction {
  @signature()
  num(a: number, b: boolean) {
    return `a is the number ${a}, b is the boolean ${b}`;
  }

  @signature()
  str(a: string) {
    return `a is the string ${a}`;
  }

  @signature()
  fish(a: Fish) {
    return `a is a fish named ${a.name}`;
  }
}

const fn = Fn.create<Fn['num'] & Fn['str'] & Fn['fish']>();
```

The `@signature` method decorator is able to derive the `typed-function` signatures from the TypeScript signature (this only supports basic types, more on this later).  We must still explicitly type the resulting function but we can refer to types by the method name.  Also notice that the `@signature()` decorator implicitly adds the `instanceof` type check for the `Fish` constructor.

### Named functions

In the example above, the resulting typed function is unnamed.  Multiple named functions can be created from a single `TypedFunction` class by passing a name to both the `signature` decorator and the `create` method.  These sets share type definitions.

```ts
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

  @signature('repeat')
  @signature('power')
  repeat(a: string, b: number) {
    return a.repeat(b);
  }
}

const double = Fn.create<Fn['double'] & Fn['twice']>('double');
const power = Fn.create<Fn['pow'] & Fn['repeat']>('power');
const repeat = Fn.create<Fn['repeat']>('repeat');

console.log(double.name); // outputs 'double'
console.log(power.name); // outputs 'power'
console.log(repeat.name); // outputs 'repeat'
```

Notice also that the `repeat` method on the `Fn` class is used to generate two different typed functions.

### Explicit typing

This library uses metadata reflections to infer types in the type signatures.  Since TypeScript only supports [basic type serialization](http://blog.wolksoftware.com/decorators-metadata-reflection-in-typescript-from-novice-to-expert-part-4#3-basic-type-serialization_1) only basic types can be inferred.  These basic types are `number`, `string`, `boolean`, `undefined`, `Array`, `Function`, `Date`, and `RegExp`.  Types that are also class constructors are supported automatically.  Other types (including `any` and union types) are treated as `Object` for `typed-function`.  To support more complex types the input parameter signatures must be supplied to the `signature` decorator as a array of strings.

```ts
class Fn extends TypedFunction {
  @signature(['number | string'])
  num(a: number | string): any { return +a; }
}

const double = Fn.create<Fn['num']>();
```

### TypeScript function overloads

We can also create a typed function from a TS method [overloads](http://www.typescriptlang.org/docs/handbook/functions.html#overloads).

```ts
class Fn extends TypedFunction {
  double(a: string): string;
  double(a: number): number;

  @signature(['string'])
  @signature(['number'])
  double(a: any): any {
    return a + a;
  }
}

const double = Fn.create<Fn['double']>();
```

Notice that as per typeScript requirements the implementation must be generic, therefore, the signatures will require a type as shown.

### Defining new types

If the `signature` decorator encounters a class it will automatically add an `instanceof` test for that type.  For example this just works:

```ts
class Fish {
  constructor(public name: string) {}
}

class Fn extends TypedFunction {
  @signature()
  name(x: Fish): string { return x.name; }
}

const fn = Fn.create<Fn['name']>();
```

For additional types use the `@type` method decorator.  The `type` decorator accepts a single string (or class constructor) as input.  This string will be the name of the new type for `typed-function` signatures, if no input is provided the method name is assumed to be the type name.  The method itself should be a TypeScript [user-defined type guard](http://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).

```ts
class Pet {
  constructor(public type: string, public name: string) {}
}

interface Fish extends Pet {
  type: 'fish'
}

class Fn extends TypedFunction {
  @type('Fish')
  isFish(arg: Pet): arg is Fish {
    return arg instanceof Pet && arg.type === 'fish';
  }

  @signature(['Fish'])
  name(x: Pet): string { return `A fish named ${x.name}`; }
}

const fn = Fn.create<Fn['name']>();
```

### Instance methods

So far we have used class instance methods only to define the types and signatures.  However, the `type` and `signature` decorators also work on static, private and protected methods and the typed-function itself could be an instance method on a class.

```ts
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

console.log(f.eat(new FishFood('worms'))); // outputs 'Yum, worms!'
console.log(f.eat(new Fish('Nemo')));      // outputs 'No way, I won't eat Nemo'
```

# Future (implementation TBD)

* Optional parameters
* Type conversions
* Inheritance

# License

This project is licensed under the MIT License - see the LICENSE file for details