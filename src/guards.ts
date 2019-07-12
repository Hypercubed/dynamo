export interface Guard<T = unknown> {
  test: GuardFunction<unknown>;
  name: string;
}

export interface Conversion<T = unknown, U = unknown> extends Guard<T> {
  id: string;
  convert: ConversionFunction<T, U>;
}

export const id = (x: any) => x;

export function union(guards: Guard[]): Guard {
  const len = guards.length;
  const tests = guards.map(g => g.test);
  const names = guards.map(g => g.name);

  if (len === 1) {
    // optimization when length is 1
    return {
      test: tests[0],
      name: names[0]
    };
  }

  const t0 = tests[0];
  const t1 = tests[1];

  const test = (x: unknown): boolean => {
    // todo: duff's device
    if (t0(x)) return true;
    if (t1(x)) return true;
    let i = 1;
    while (++i < len) {
      if (tests[i](x)) return true;
    }
    return false;
  };

  return {
    test,
    name: names.join('|')
  };
}

/**
 * Returns a function that applies the first converter to the first matching guard
 */
export function matcher(cons: Conversion[]): ConversionFunction {
  const len = cons.length;

  if (len === 0 || cons.length < len) {
    // optimization when there are no guards or converters
    return id;
  }

  const t0 = cons[0].test;
  const c0 = cons[0].convert;

  if (len === 1) {
    // optimization when length is one
    return (x: unknown) => {
      if (t0(x)) c0(x);
    };
  }

  const t1 = cons[1].test;
  const c1 = cons[1].convert;

  const tests = cons.map(x => x.test);
  const converters = cons.map(x => x.convert);

  return (x: unknown) => {
    // duff's?
    if (t0(x)) return c0(x);
    if (t1(x)) return c1(x);
    let i = 1;
    while (++i < len) {
      if (tests[i](x)) return converters[i](x);
    }
  };
}

export function tuple(guards: Guard[]): Guard {
  const len = guards.length;
  const name = `[${guards.map(g => g.name).join(',')}]`;

  if (len === 0) {
    // optimization when length is zero
    return {
      test: (x: unknown[]) => x.length === 0,
      name
    };
  }

  const t0 = guards[0].test;

  if (len === 1) {
    // optimization when length is 1
    return {
      test: (x: unknown[]): x is any => {
        return x.length === 1 && t0(x[0]);
      },
      name
    };
  }

  const t1 = guards[1].test;
  const tests = guards.map(g => g.test);

  const test = (x: unknown[]): x is any => {
    // duff's machine?
    if (x.length !== len) return false;
    if (!t0(x[0])) return false;
    if (!t1(x[1])) return false;
    let i = 1;
    while (++i < len) {
      if (!tests[i](x[i])) return false;
    }
    return true;
  };

  return {
    test,
    name
  };
}

export function index(guards: GuardFunction[]): (x: any) => number {
  const len = guards.length;

  if (len === 0) {
    // optimization when length is zero
    return () => {
      return -1;
    };
  }

  return (x: any[]) => {
    // Duff’s Device
    const startAt = len % 8;
    let i = -1;
    switch(startAt) {
      case 0: if (guards[++i](x)) return i;
      case 7: if (guards[++i](x)) return i;
      case 6: if (guards[++i](x)) return i;
      case 5: if (guards[++i](x)) return i;
      case 4: if (guards[++i](x)) return i;
      case 3: if (guards[++i](x)) return i;
      case 2: if (guards[++i](x)) return i;
      case 1: if (guards[++i](x)) return i;
    }

    let iterations = Math.floor(len / 8);
    while (iterations--) {
      if (guards[++i](x)) return i;
      if (guards[++i](x)) return i;
      if (guards[++i](x)) return i;
      if (guards[++i](x)) return i;
      if (guards[++i](x)) return i;
      if (guards[++i](x)) return i;
      if (guards[++i](x)) return i;
      if (guards[++i](x)) return i;
    }

    return -1;
  };
}

export function intersect(guards: GuardFunction[]): GuardFunction {
  const len = guards.length;

  const g0 = guards[0];

  if (len === 1) {
    // Optimization for length === 1
    return g0;
  }

  const g1 = guards[1];

  return (x: unknown): any => {
    // duff's device?
    if (!g0(x)) return false; // opt for len == 2
    if (!g1(x)) return false;
    let i = 1;
    while (++i < len) {
      if (!guards[i](x)) return false;
    }
    return true;
  };
}

/**
 * Returns a function that applies each converter to each element in an array
 */
export function mapper(converters: ConversionFunction[]): ConversionFunction<unknown[], unknown[]> {
  const len = converters.length;

  if (len === 0) {
    // Optimization for special there are no converters
    return id;
  }

  const c0 = converters[0];

  if (len === 1) {
    // Optimization for len = 1
    return (args: unknown[]) => {
      args[0] = c0(args[0]);
      return args;
    };
  }

  const c1 = converters[0];

  return (args: unknown[]) => {
    // duff's device?
    args[0] = c0(args[0]);  // opt for len == 2
    args[1] = c1(args[1]);
    let i = 1;
    while (++i < len) {
      args[i] = converters[i](args[i]);
    }
    return args;
  };
}
