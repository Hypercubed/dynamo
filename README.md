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
import { signature, typed } from './ts-typed-function';

class Print {
  name: 'print';

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

const print = typed.function(Print);

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

typed.addType({
  name: 'Fish',
  test: function(a) {
    return a instanceof Fish;
  }
});

// create a typed function
const fn = typed({
  'number, boolean': function (a, b) {
    return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
  },
  'string': function (a) {
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
import * as typed from 'typed-function';

typed.addType({
  name: 'Fish',
  test: function(a: any): a is Fish {
    return a instanceof Fish;
  }
});

const fn = typed({
  'number, boolean': function (a: number, b: boolean) {
    return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
  },
  'string': function (a: string,) {
    return `a is "${a}"`;
  },
  'Fish': function (a: Fish) {
    return `a is a fish named ${a.name}`;
  }
});
```

The resulting function has the same runtime behavior.  However, we notice three issues:

1) The input parameter types are redundantly defined, once for TypeScript and once for `typed-function`.
2) The resulting function `fn` has a TypeScript type of `any`, and therefore provides no type safety.

This last issue can be solved by typing the resulting function:

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

type F = typeof signatures['number, boolean'] & typeof signatures['string'] & typeof signatures['Fish'];
const fn: F = typed(fnSignatures);
```

Notice we are first defining the signatures object, then using the types of the these signatures to define the type of the typed-function. This is much better in terms of type safety but adds even more redundancy and not a great developer experience.

### `ts-typed-function`

`ts-typed-function` uses classes and method decorators to improve the developer experience:

```ts
import { signature, typed } from '@hypercubed/ts-typed-function';

typed.addType({
  name: 'Fish',
  test: function(a: any): a is Fish {
    return a instanceof Fish;
  }
});

class Print {
  static name = 'print';

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

const print = typed.function(Print);
```

The create method is able to derive the `typed-function` signatures from the TypeScript signature (this only supports basic types, more on this later).

### Explicit typing

This library uses metadata reflections to infer types in the type signatures.  Since TypeScript only supports [basic type serialization](http://blog.wolksoftware.com/decorators-metadata-reflection-in-typescript-from-novice-to-expert-part-4#3-basic-type-serialization_1) only basic types can be inferred.  These basic types are `number`, `string`, `boolean`, `undefined`, `Array`, `Function`, `Date`, and `RegExp`.  Types that are also class constructors are are also supported.  Other types (including `any`, union types, and interfaces) are treated as `Object` for `typed-function`.  To support more complex types the input parameter signatures must be supplied to the `signature` decorator as a array of strings or class constructors.

```ts
class Fn {
  @signature(['number | string'])
  num(a: number | string): any { return +a; }
}

const double = typed.function(Fn);
```

### TypeScript function overloads

We can also create a typed function from a TS method [overloads](http://www.typescriptlang.org/docs/handbook/functions.html#overloads).

```ts
class Fn {
  double(a: string): string;
  double(a: number): number;

  @signature(['string'])
  @signature(['number'])
  double(a: any): any {
    return a + a;
  }
}

const double = typed.function(Fn);
```

Notice that as per typeScript requirements the implementation must be generic, therefore, the signatures will require a type as shown.

### Inheritance

Signatures and types are inherited:

```ts
interface Decimal {
  $decimal: string;
}

class InspectDecimal {
  @signature(['Decimal'])
  decimal(x: Decimal): string { return `the decimal ${x.$decimal}`; }
}

class Inspect extends InspectDecimal {
  @signature()
  number(x: number): string { return `the number ${x}`; }
}

const inspect = typed.function(Inspect);

console.log(inspect(42));            // outputs 'the number 42'
console.log(inspect({ $decimal: '42' }));   // outputs 'the decimal 42'
```

# Future (implementation TBD)

* Optional parameters
* Type conversions

# License

This project is licensed under the MIT License - see the LICENSE file for details