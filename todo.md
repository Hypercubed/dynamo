# @hypercubed/dynamo

## Todo
- error if `add` does not add anything
- method to get type data (guard and name)

## Look into
- `guard` and `conversions` on function definition class (isolated to a single?)
- Child environments inherit types and conversions from parent?
- Use `Is` functions directly as a Type?
- add both plain object (`Object`) and any object (`Record`)
- `Any` vs `Unknown`? Any known type, any unknown type, or any type?
- Test with other runtime type check libs:
  - Automatic/mongoose
  - check-complex-types
  - gcanti/io-ts
- more tests without default types

## Non-goals (at this time)
- Optional arguments
- Rest arguments