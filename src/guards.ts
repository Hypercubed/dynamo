export const id = (x: any) => x;

export function union(guards: Array<Guard<unknown>>) {
  const len = guards.length;

  const g0 = guards[0];

  if (len === 1) {
    // optimization when length is 1
    return g0;
  }

  const g1 = guards[1];

  return (x: unknown): boolean => {
    if (g0(x)) return true;
    if (g1(x)) return true;
    let i = 1;
    while (++i < len) {
      if (guards[i](x)) return true;
    }
    return false;
  };
}

/**
 * Returns a function that applies the first converter to the first matching guard
 */
export function matcher(
  guards: Array<Guard<unknown>>,
  converters: Array<Conversion<unknown, unknown>>
): Conversion<unknown, unknown> {
  const len = guards.length;

  if (len === 0 || converters.length < len) {
    // optimization when there are no guards or converters
    return id;
  }

  const g0 = guards[0];
  const c0 = converters[0];

  if (len === 1) {
    // optimization when length is one
    return (x: unknown) => {
      if (g0(x)) c0(x);
    };
  }

  const g1 = guards[1];
  const c1 = converters[1];

  return (x: unknown) => {
    if (g0(x)) return c0(x);
    if (g1(x)) return c1(x);
    let i = 1;
    while (++i < len) {
      if (guards[i](x)) return converters[i](x);
    }
  };
}

export function tuple(guards: Array<Guard<unknown>>): Guard<unknown> {
  const len = guards.length;

  if (len === 0) {
    // optimization when length is zero
    return (x: unknown[]) => x.length === 0;
  }

  const g0 = guards[0];

  if (len === 1) {
    // optimization when length is 1
    return (x: unknown[]): x is any => {
      return x.length === 1 && g0(x[0]);
    };
  }

  const g1 = guards[1];

  return (x: unknown[]): x is any => {
    if (x.length !== len) return false;
    if (!g0(x[0])) return false;
    if (!g1(x[1])) return false;
    let i = 1;
    while (++i < len) {
      if (!guards[i](x[i])) return false;
    }
    return true;
  };
}

export function choose<Z>(cases: Array<[any, Z]>): (x: any) => Z {
  const len = cases.length;

  if (len === 0) {
    // optimization when length is zero
    // shouldn't really be here anyway
    return () => {
      throw new Error('No alternatives were matched');
    };
  }

  const [c00, c01] = cases[0];

  if (len === 1) {
    // optimization when length is one
    return (x: any) => {
      if (c00(x)) return c01;
      throw new Error('No alternatives were matched');
    };
  }

  const [c10, c11] = cases[1];

  return (x: any) => {
    if (c00(x)) return c01;  // optimizations for len == 2
    if (c10(x)) return c11;
    let i = 1;
    while (++i < len) {
      if (cases[i][0](x)) return cases[i][1];
    }
    throw new Error('No alternatives were matched');
  };
}

export function intersect(guards: Array<Guard<unknown>>): Guard<unknown> {
  const len = guards.length;

  const g0 = guards[0];

  if (len === 1) {
    // Optimization for length === 1
    return g0;
  }

  const g1 = guards[1];

  return (x: unknown): any => {
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
export function mapper(converters: Array<Conversion<unknown, unknown>>): Conversion<unknown[], unknown[]> {
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
    args[0] = c0(args[0]);  // opt for len == 2
    args[1] = c1(args[1]);
    let i = 1;
    while (++i < len) {
      args[i] = converters[i](args[i]);
    }
    return args;
  };
}
