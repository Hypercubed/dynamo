export interface Constructor<V> extends Function {
  readonly prototype: any;
  new(...args: any[]): V;
}

export interface ConstructorLike<V> extends Function {
  (value?: any): V;
  readonly prototype: any;
}

export type Is<T = unknown> = ((x: unknown) => x is T) | ((x: unknown) => boolean);
export type Convert<A = unknown, O = unknown> = (a: A) => O;

export type AnyFunction = (...args: any[]) => any;

export type Type = Constructor<unknown> | ConstructorLike<unknown> | null | undefined | object;

export type FunctionKeys<T> = { [K in keyof T]: T[K] extends AnyFunction ? K : never }[keyof T];
export type Intersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
export type FunctionProperties<T> = Intersection<T[FunctionKeys<T>]>;
