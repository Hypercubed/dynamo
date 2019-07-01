# ts-typed-function

Typed-functions in TS using decorators

## Introduction

[josdejong/typed-function](https://github.com/josdejong/typed-function) provides a flexible and organized way to do run-time type checking and overloading in JavaScript.  `ts-typed-function` is an experimental TypeScript wrapper on top of `typed-function`.

`typed-function` has the following features:

* Runtime type-checking of input arguments.
* Automatic type conversion of arguments.
* Compose typed functions with multiple signatures.
* Supports union types, any type, and variable arguments.
* Detailed error messaging.

`ts-typed-function` adds the following:

* Typed function signatures from TypeScript types.
* Appropriate TS types for typed functions.
* Types and type conversions can be added from the class

## TLDR `ts-typed-function` Usage

```ts
import { Typed, guard, conversion, signature } from 'ts-typed-function';

// Create a new, isolated instance of ts-typed-function.
const typed = new Typed();

// This is a typical  TS class definition
class Complex {

  // The `@guard` decorator is used to determine idenity of this class at runtime
  // By default a guard is a test for the containing class
  // in this case this is a runtime test for the `Complex` type
  @guard()
  static isComplex(a: any): a is Complex {
    return a instanceof Complex;
  }

  // The `@conversion` decorator defines a method for converting one type into another
  // ts-typed-function uses the TS types to determine the conversion
  // in this case from a `number` to a C`omplex` class instance
  @conversion()
  static fromNumber(a: number): Complex {
    return new Complex(a, 0);
  }

  constructor(public re: number, public im: number) {}

  times(b: Complex): Complex {
    return new Complex(this.re * b.re - this.im * b.im, this.re * b.im + this.re * b.im);
  }
}

// Once added to the ts-typed-function instance the type and conversions are defined
typed.add(Complex);

// This class is a `ts-typed-function` function definition
class Times {
  // the resulting function will have this name
  // Default is the class name
  name: 'times';

  // The `@signature` decorator defines a signiture for typed-function
  // The types are infered from the TS types, in this case (`number, number`)
  // This method is only invoked if both inputs are `number`.
  @signature()
  number(a: number, b: number): number {
    return a * b;
  }

  // this is a TS override so for the `complex` method defined below
  // This is necessary to get a properly typed ts-typed-function
  complex(a: number | Complex, b: number | Complex): Complex;

  // The `@signature` decorator defines a signiture for typed-function
  // The types are infered from the TS compile time types, in this case (`Complex, Complex`)
  // This methid is invoked if both inputs are `Complex`
  // The conversion from `number` to Complex (defined above) will allow 
  // `numbers` to be converted to `Complex` before this is invoked
  @signature()
  complex(a: Complex, b: Complex): Complex {
    return a.times(b);
  }
}

// Generates the typoed function
// The TS defintion of this function is the intersection of all methods (and overrides) on the `Times` class
// in this case `((a: number, b: number) => number) & (a: number | Complex, b: number | Complex) => Complex)`
const times = typed.function(Times);

// returns 18, with TS compile type of `number`
times(3, 6);

// returns the complex number (18i) with TS compile time type of `Complex`
times(new Complex(3, 0), new Complex(0, 6));

// returns the complex number (18i) with TS compile time type of `Complex`
times(3, new Complex(0, 6));

// TS doesn't allow passing a string to the times function at compile time
// typed-funtion would throw a TypeError at runtime
// times(3, '6');
```

## Usage Explanation

### `typed-function` in TypeScript without ts-typed-function

```js
import * as typed from 'typed-function';

class Complex {
  @guard()
  static isComplex(a: any): a is Complex {
    return a instanceof Complex;
  }

  // The `@conversion` decorator defines a method for converting one type into another
  // ts-typed-function uses the TS types to determine the conversion
  // in this case from a `number` to a C`omplex` class instance
  @conversion()
  static fromNumber(a: number): Complex {
    return new Complex(a, 0);
  }

  constructor(public re: number, public im: number) {}

  times(b: Complex): Complex {
    return new Complex(this.re * b.re - this.im * b.im, this.re * b.im + this.im * b.re);
  }
}

// Tell `typed-function` how to determine the Complex class instance at runtime
typed.addType({
  name: 'Complex',
  test: Complex.isComplex
});

// Tell `typed-function` how to coinvert a `number` to a `Complex`
typed.addConversion({
  from: 'number'
  to: 'Complex',
  convert: Complex.fromNumber
});

// create a typed function
const times = typed({
  'number, number': function (a: number, b: number) {
    return a * b;
  },
  'Complex, Complex': function (a: Complex, b: Complex): Complex {
    return a.times(b);
  }
});

// returns 18 (typed as any)
times(3, 6);

// returns the complex number (18i) (typed as any)
times(new Complex(3, 0), new Complex(0, 6));

// returns the complex number (18i) (typed as any)
times(3, new Complex(0, 6))

// Typescript allows this
// typed-funtion throws at runtime
times(3, '6')
```

The resulting function has the same runtime behavior as the `ts-typed-function` above.  However, we notice three issues:

1) The type and conversions for redundantly defined
2) The function parameters are redundantly typed, once for TS and once for `typed-function`.
3) The resulting function (`times`) has a TypeScript type of `any`, and therefore provides no type safety.

### Explicit typing

This library uses metadata reflections to infer types in the type signatures.  Since TypeScript only supports [basic type serialization](http://blog.wolksoftware.com/decorators-metadata-reflection-in-typescript-from-novice-to-expert-part-4#3-basic-type-serialization_1) only basic types can be inferred.  These basic types are `number`, `string`, `boolean`, `undefined`, `Array`, `Function`, `Date`, and `RegExp`.  Types that are class constructors are are also supported.  Other types (including `any`, union types, and interfaces) are treated as `Object` for `typed-function`.  To support more complex types the input parameter signatures must be supplied to the `signature` decorator as a array of strings or class constructors.

```ts
class Fn {
  @signature(['number | string'])
  num(a: number | string): any {
    return +a;
  }
}

const fn = typed.function(Fn);
```

### TypeScript function overloads

We can also create a typed function from a TS method [overloads](http://www.typescriptlang.org/docs/handbook/functions.html#overloads).

```ts
class Fn {
  double(a: string): string;
  double(a: number): number;

  @signature(['string'])
  @signature(['number'])
  double(a: string | number): any {
    return a + a;
  }
}

const fn = typed.function(Fn);
```

Notice that as per TS requirements the overload signature must be compatible with its implementation signature, therefore, the signatures decorators will require a type as shown.

### Inheritance

Signatures are inherited:

```ts
class PrintComplex {
  @signature()
  complex(x: Complex): string {
    return `(${x.re}, ${x.im})`;
  }
}

class Print extends PrintComplex {
  @signature()
  number(x: number): string {
    return '' + x;
  }
}

const print = typed.function(Print);

print(42);                   // outputs "42"
print(new Complex(3,1));     // outputs "(3, 1)"
```

# License

This project is licensed under the MIT License - see the LICENSE file for details