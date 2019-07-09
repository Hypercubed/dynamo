# ts-typed-function

Runtime function overloading in TypeScript using decorators.  Easy to read and understand class definitions are converted to overloaded functions.  Avoids nasty runtime typechecking.

## Introduction

* Compose multiple method signatures into a correctly typed function.
* Runtime type-checking of function arguments based on TypeScript type signatures.
* Defined types coercions.
* Supports union types, `any` type, and variable arguments.

> Requires `experimentalDecorators` and `emitDecoratorMetadata` be enabled in your tsconfig.

## TLDR Usage

```ts
import { Typed, guard, conversion, signature, Any } from 'ts-typed-function';

const typed = new Typed();

class Complex {

  @guard()
  static isComplex(a: any): a is Complex {
    return a instanceof Complex;
  }

  @conversion()
  static fromNumber(a: number): Complex {
    return new Complex(a, 0);
  }

  constructor(public re: number, public im: number) {}

  add(b: Complex): Complex {
    const re = this.re + b.re;
    const im = this.re + b.im;
    return new Complex(re, im);
  }
}

typed.add(Complex);

class Add {
  name: 'add';

  @signature()
  number(a: number, b: number): number {
    return a + b;
  }

  complex(a: number | Complex, b: number | Complex): Complex;

  @signature()
  complex(a: Complex, b: Complex): Complex {
    return a.add(b);
  }
}

// typed as `((number, number) => number) & ((number | Complex, number | Complex) => Complex)`
const times = typed.function(Times);

add(3, 6);                                  // 9
add(new Complex(3, 0), new Complex(0, 6));  // Complex(3, 6)
times(3, new Complex(0, 6));                // Complex(3, 6)

// @ts-ignore
times(3, '6');  // TypeError
```

## Usage Explanation

### Typed instance

Start by creating a `typed` environment.  Types and conversions are local to this instance.

```ts
import { Typed, guard, conversion, signature, Any } from 'ts-typed-function';

const typed = new Typed();
```

Options TBR

### Signatures

Typed-functions are defined using a class with one or more `@signature` decorators and the `typed.function` method.

```ts
class Add {
  @signature()
  str(a: string, b: string): string {
    return a + ' ' + b;
  }

  @signature()
  num(a: number, a: number): number {
    return a + b;
  }
}

// correctly typed as `((a: string, a: string) => string & (a: number, a: number) => number)`
const add = typed.function(Add);

add(20, 22);             // 42
add('Hello', 'World');   // "Hello World"

// @ts-ignore
add('Hello', 42);  // TypeError
```

This library uses metadata reflections to infer types from the TypeScript type signatures.  Since TypeScript only supports [basic type serialization](http://blog.wolksoftware.com/decorators-metadata-reflection-in-typescript-from-novice-to-expert-part-4#3-basic-type-serialization_1) only basic types can be inferred.  Basic types defined by default are the primitives `number`, `string`, `boolean` and the constructors `Array`, `Function`, `Date`, and `RegExp`.  Types that are class constructors are are also supported but must be defined per `Typed` instance (see types below).

TypeScript serializes both `undefined` and `null` as `void 0`, so these types should be explicitly listed in the signature.  Use the predefined class `Any` for `unknown` or `any`.

```ts
class Inspect {
  @signature(undefined)
  u(a: undefined): string {
    return 'a is undefined';
  }

  @signature(null)
  n(a: null): string {
    return 'a is null';
  }

  @signature(Any)
  n(a: unknown): string {
    return 'a is something';
  }
}

// correctly typed as `((a: undefined) => string & (a: null) => string & (a: unknown) => string)`
const inspect = typed.function(Inspect);

inspect(undefined); // 'a is undefined'
inspect(null);      // 'a is null'
inspect('string');  // 'a is something'
```

Other types (including `any`, `unknown`, union types, and interfaces) are treated as `Object` by TypeScript type serialization.  To support more complex types the input parameter signatures must be supplied to the `signature` decorator.  For type unions use an array.  When listing explicit signatures for primitives used the built-in constructors.

```ts
class Add {
  @signature(String, [Number, String])
  add(a: string, b: number | string): string {
    return '' + a + ' ' + b;
  }

  @signature()
  add(a: number, b: number): string {
    return a + b;
  }
}

// correctly typed as `((a: string, b: number | string) => string) & (a: number, a: number) => number)`
const add = typed.function(Add);

add(20, 22);            // 42
add('Hello', 'World');  // 'Hello World'
add('Hello', 42);       // 'Hello 42'

// @ts-ignore
add(20, 'World');       // TypeError
```

Signatures are inherited:

```ts
class AddNumber {
  @signature()
  num(a: number, a: number): number {
    return a + b;
  }
}

class AddStrings extends AddNumber {
  @signature(String, [Number, String])
  add(a: string, b: number | string): string {
    return '' + a + ' ' + b;
  }
}

// has the type of `((a: number, a: number) => number) & ((a: string, b:  number | string) => string)`
const add = typed.function(Print);  

add(20, 22);            // 42
add('Hello', 'World');  // 'Hello World'
add('Hello', 42);       // 'Hello 42'

// @ts-ignore
add(20, 'World');       // TypeError
```

### Types

Runtime types are added using the `@guard` decorator and the `typed.add` method.

```ts
class Complex {
  @guard()
  static isComplex(x: unknown): x is Complex {
    return x instanceof Complex;
  }
}

typed.add(Complex);
```

You can add runtime constraints to primitives by extending the primitive constructor.

```ts
class Integer extends Number {
  @guard()
  static isInteger(x: unknown): x is Integer {
    return typeof x === 'number' && Number.isInteger(x);
  }
}

typed.add(Integer);
```

Guards defined on classes are inherited.

```ts
class Even extends Integer {
  @guard()
  static isEven(x: number): x is Even {
    // isInteger guard on `Integer` is invoked before isEven
    return x % 2 === 0;
  }
}

typed.add(Even);
```

In the examples above the runtime type guards exists on the class itself.  Guards can be added to other classes by passing the class to the decorator.

```ts
import Decimal from 'decimal.js';

class Numbers {
  @guard(Decimal)
  static isDecimal(x: unknown): x is Decimal {
    return x instanceof Decimal;
  }

  @guard(BigInt)
  static isBigInt(x: unknown): x is BigInt {
    return typeof x === 'bigint';
  }
}

typed.add(Numbers);
```

In these cases the defininions are attached to the containing class not the type.

TBR One weird trick!!

### Conversions

Runtime conversions are added using the `@conversion` decorator and the `add` method.

```ts
class Complex {
  @guard()
  static isComplex(a: any): a is Complex {
    return a instanceof Complex;
  }

  @conversion()
  static fromNumber(a: number): Complex {
    return new Complex(a, 0);
  }

  constructor(public re: number, public im: number) {}
}

typed.add(Complex);
```

When defining the function add an override to the type to get the correct signature, ts-typed-function will handle the conversion.

```ts
class add {
  name = 'add';

  add(a: number | Complex, b: number | Complex);

  @signature()
  add(a: Complex, b: Complex): Complex {
    return a.abb(b);
  }
}

// typed as (a: number | Complex, b: number | Complex) => Complex
const add = typed.function(Add);
```

Function methods are evaluated with priority from top to bottom.  Note in this case the `number` methid is envoked if both arguments are numbers, the complex methid is invoked only when one or both are are `Complex` instances.

```ts
class add {
  name = 'add';

  @signature()
  number(a: number, b: number): number {
    return a + b;
  }

  complex(a: number | Complex, b: number | Complex);

  @signature()
  complex(a: Complex, b: Complex): Complex {
    return a.abb(b);
  }
}

// typed as `((a: number, b: number) => number & (a: number | Complex, b: number | Complex) => Complex)`
const add = typed.function(Add);

add(20, 22);                                  // 42
add(new Complex(20, 0), new Complex(0, 22));  // Complex(20, 22)
times(20, new Complex(0, 22));                // Complex(20, 22)

// @ts-ignore
times(20, '22');  // TypeError
```

# License

This project is licensed under the MIT License - see the LICENSE file for details