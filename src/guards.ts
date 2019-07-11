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

export function index(guards: Array<Guard<unknown>>): (x: any) => number {
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
