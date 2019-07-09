# ts-typed-function

#  Todos
- better errors
- test `this` binding
- test no default types
- document complex type trick
- document autoadd. skip defaults
- for conversions store guard instead of `fromType` to avoid a strong reference!!
- test if `choose` is better as an `indexOf`.
- add benchmarks for:
  - overload.js
  - function-overloader
  - node-polymorphic
  - overlord-js
  - overloading
  - node-overloading


# Look into
- `guard` and `conversions` on function definition class (isolated?)
- Child environments inherit types and conversions from parent?
- Use type guards directly as a Type?
- add both plain object and any object
- Any vs Unknown? Any known type, any unknown type, or any type?
- Test with other runtime type chekc libs:
  - Automattic/mongoose
  - check-complex-types


# Non-goals (at this time)
- Optional arguments
- Rest arguments