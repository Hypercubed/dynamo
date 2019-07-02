interface Constructor {
  prototype: any;
  new(...args: any[]);
}

type AnyFunction = (...args: any[]) => any;
type TypeToken = Constructor | AnyFunction | Object | null | undefined;

interface SignatureMap {
  [key: string]: AnyFunction;
}

interface TypedType {
  name: string;
  test: (x: any) => boolean;
}

interface TypedConversion<T, U> {
  from: string;
  to: string;
  convert: (x: T) => U;
}

type FunctionKeys<T> = { [K in keyof T]: T[K] extends AnyFunction ? K : never }[keyof T];
type Intersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type FunctionProperties<T> = Intersection<T[FunctionKeys<T>]>;
