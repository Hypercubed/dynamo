interface Constructor<V> extends Function {
  readonly prototype: any;
  new(...args: any[]): V;
}

interface ConstructorLike<V> extends Function {
  (value?: any): V;
  readonly prototype: any;
}

type AnyFunction = (...args: any[]) => any;

type Type = Constructor<unknown> | ConstructorLike<unknown> | null | undefined;

type FunctionKeys<T> = { [K in keyof T]: T[K] extends AnyFunction ? K : never }[keyof T];
type Intersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type FunctionProperties<T> = Intersection<T[FunctionKeys<T>]>;
