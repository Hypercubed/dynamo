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

* Input arguments inferred from TypeScript types
* Appropriate type signatures for typed functions.

## TLDR Usage

(because nobody reads past the first example)

```ts
import { signature, type } from './ts-typed-function';

class Fn extends TypedFunction {
  @signature()
  num(a: number, b: boolean) {
    return `a is the number ${a}, b is the boolean ${b}`;
  }

  @signature()
  str(a: string, b: boolean) {
    return `a is the string ${a}, b is the boolean ${b}`;
  }
}

const fn = Fn.create<Fn['num'] & Fn['str']>();

// use the functions
console.log(fn(42, true));              // outputs 'a is the number 42, b is TRUE'
console.log(fn('everything', false));   // outputs 'a is "everything", b is FALSE'
 
try {
  // fn('hello', 'world');       // This will not pass TS compiler
  (fn as any)('hello', 'world'); // This will
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

// create a typed function
const fn = typed({
  'number, boolean': function (a, b) {
    return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
  },
  'string, boolean': function (a, b) {
    return `a is "${a}", b is ${b.toString().toUpperCase()}`;
  }
});
```

Here we have created a function that takes as input a number and a boolean or a string and a boolean.  Calling the function with any other parameter types as input will throw a runtime error.

### `typed-function` with TypeScript

Doing the same in TypeScript is similar:

```ts
import { default as typed } from 'typed-function';

const fn = typed({
  'number, boolean'(a: number, b: boolean) {
    return `a is the number ${a}, b is ${b.toString().toUpperCase()}`;
  },
  'string, boolean'(a: string, b: boolean) {
    return `a is "${a}", b is ${b.toString().toUpperCase()}`;
  }
});
```

The resulting function has teh same runtime behavior.  However, we notice two issues:

1) The input parameter types are redundantly defined, once for TypeScript and once for `typed-function`.
2) The resulting function `fn` has a TypeScript type of `any`, and therefore provides no type safety.

Issue #2 can be solved by typing the resulting function:

```ts
const signatures = {
  'number, boolean'(a: number, b: boolean) {
    return 'a is a number, b is a boolean';
  },
  'string, number'(a: string, b: boolean) {
    return 'a is a string, b is a number';
  }
};

const fn: typeof signatures['number, boolean'] & typeof signatures['string, number'] = typed(fnSignatures);
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
  str(a: string, b: boolean) {
    return `a is the string ${a}, b is the boolean ${b}`;
  }
}

const fn = Fn.create<Fn['num'] & Fn['str']>();
```

The `@signature` method decorator is able to derive the `typed-function` signatures from the typeScript signature (this only supports basic types, more on this later).  We must still explicitly type the resulting function but we can refer to types by the method name.

### Advanced Usage (TBR)

* Complex/explicit types
* Multiple signature sets per class/named functions
* Type definitions
* type conversions (implementation TBD)
* Inheritance (implementation TBD)

License

This project is licensed under the MIT License - see the LICENSE file for details