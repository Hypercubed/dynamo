import { Is, Convert } from './ts-types';

export interface Guard<T = unknown> {
  test: Is<T>;
  name: string;
}

export interface Converter<T = unknown, U = unknown> {
  id: string;
  name: string;
  test: Is<T>;
  convert: Convert<T, U>;
}

export const identity = <A>(a: A): A => a;

/**
 * Converts an array of guards into a guard for the union of guard functions
 * @param guards an array of guards
 */
export function union<T = unknown>(guards: Array<Guard<T>>): Guard<T[keyof T]> {
  const tests = guards.map(g => g.test);
  const names = guards.map(g => g.name);

  if (guards.length === 1) {
    // optimization when length is 1
    return {
      test: tests[0],
      name: names[0]
    };
  }

  const n = tests.length - 1;
  const startAt = tests.length % 4;
  const test = (x: unknown): boolean => {
    let i = -1;

    switch(startAt) {
      case 0: if (tests[++i](x)) return true;
      case 3: if (tests[++i](x)) return true;
      case 2: if (tests[++i](x)) return true;
      case 1: if (tests[++i](x)) return true;
    }

    while (i < n) {
      if (tests[++i](x)) return true;
      if (tests[++i](x)) return true;
      if (tests[++i](x)) return true;
      if (tests[++i](x)) return true;
    }
    return false;
  };

  return {
    test,
    name: names.join('|')
  };
}

/**
 * Returns a function that applies the first converter to the first matching guard test
 */
export function matcher<T = unknown, U = unknown>(cons: Array<Converter<T, U>>): Convert<T, U> {
  if (cons.length === 0) {
    // optimization when there are no guards or converters
    return identity as Convert<T, U>;
  }

  const t0 = cons[0].test;
  const c0 = cons[0].convert;

  if (cons.length === 1) {
    // optimization when length is one
    return (x: unknown) => {
      if (t0(x)) return c0(x);
    };
  }

  const tests = cons.map(x => x.test);
  const converters = cons.map(x => x.convert);

  const n = cons.length - 1;
  const startAt = cons.length % 4;
  return (x: unknown) => {
    let i = -1;

    switch(startAt) {
      case 0: if (tests[++i](x)) return converters[i](x);
      case 3: if (tests[++i](x)) return converters[i](x);
      case 2: if (tests[++i](x)) return converters[i](x);
      case 1: if (tests[++i](x)) return converters[i](x);
    }

    while (i < n) {
      if (tests[++i](x)) return converters[i](x);
      if (tests[++i](x)) return converters[i](x);
      if (tests[++i](x)) return converters[i](x);
      if (tests[++i](x)) return converters[i](x);
    }
  };
}

/**
 * Converts an array of guards into a guard for the tuple
 * @param guards an array of guards
 */
export function tuple<T = unknown>(guards: Array<Guard<T>>): Guard<T[]> {
  const name = `[${guards.map(g => g.name).join(',')}]`;

  if (guards.length === 0) {
    // optimization when length is zero
    return {
      test: (x: unknown[]) => x.length === 0,
      name
    };
  }

  const tests = guards.map(g => g.test);
  const t0 = tests[0];

  if (guards.length === 1) {
    // optimization when length is 1
    return {
      test: (x: unknown[]): x is any => x.length === 1 && t0(x[0]),
      name
    };
  }

  const t1 = tests[1];
  const len = guards.length;
  const n = guards.length - 1;
  const test = (x: unknown[]): x is any => {
    // optimized for couples
    if (x.length !== len) return false;
    if (!t0(x[0])) return false;
    if (!t1(x[1])) return false;
    let i = 1;
    while (i < n) {
      if (!tests[++i](x[i])) return false;
    }
    return true;
  };

  return {
    test,
    name
  };
}

/**
 * Converts an array of guard functions into a guard function for the intersection
 * @param guards an array of guards
 */
export function intersect<T = unknown>(guards: Array<Is<unknown>>): Is<T> {
  if (guards.length === 1) {
    // Optimization for length === 1
    return guards[0];
  }

  const n = guards.length - 1;
  const startAt = guards.length % 4;
  return (x: unknown): any => {
    let i = -1;

    switch(startAt) {
      case 0: if (!guards[++i](x)) return false;
      case 3: if (!guards[++i](x)) return false;
      case 2: if (!guards[++i](x)) return false;
      case 1: if (!guards[++i](x)) return false;
    }

    while (i < n) {
      if (!guards[++i](x)) return false;
      if (!guards[++i](x)) return false;
      if (!guards[++i](x)) return false;
      if (!guards[++i](x)) return false;
    }
    return true;
  };
}

/**
 * Returns a function that applies each converter to each element in an array
 */
export function mapper<T = unknown, U = unknown>(converters: Array<Convert<T, U>>): Convert<T[], U[]> {
  if (converters.length === 0) {
    // Optimization for special there are no converters
    return identity as Convert<T[], U[]>;
  }

  const c0 = converters[0];

  if (converters.length === 1) {
    // Optimization for len = 1
    return (args: Array<T | U>) => {
      args[0] = c0(args[0] as T);
      return args as U[];
    };
  }

  const c1 = converters[1];

  const n = converters.length - 1;
  return (args: Array<T | U>) => {
    // opt for len = 2
    args[0] = c0(args[0] as T);
    args[1] = c1(args[1] as T);
    let i = 1;
    while (i < n) {
      args[++i] = converters[i](args[i] as T);
    }
    return args as U[];
  };
}
