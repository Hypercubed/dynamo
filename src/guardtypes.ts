import { guard } from './decorators';

const I = (x: unknown) => x;

export class Unknown {
  @guard()
  static isUnknown(x: unknown): x is unknown {
    return true;
  }
}

export function union(guards: Array<Guard<unknown>>) {
  const len = guards.length;
  if (len === 1) {
    // optimization when length is 1
    return guards[0];
  }
  return (x: unknown): boolean => {
    let i = -1;
    while (++i < len) {
      if (guards[i](x)) return true;
    }
    return false;
  };
}

export function matcher(
  guards: Array<Guard<unknown>>,
  converters: Array<Conversion<unknown, unknown>>
): Conversion<unknown, unknown> {
  const len = guards.length;
  return (x: unknown) => {
    let i = -1;
    while (++i < len) {
      if (guards[i](x)) return converters[i](x);
    }
  };
}

export function tuple(guards: Array<Guard<unknown>>): Guard<unknown> {
  const len = guards.length;
  const lguard = (x: unknown[]) => x.length === len;

  if (len === 0) {
    // optimization when length is zero
    return (x: unknown[]) => x.length === 0;
  }

  if (len === 1) {
    // optimization when length is 1
    const g0 = guards[0];
    return (x: unknown[]): x is any => {
      return x.length === 1 && g0(x[0]);
    };
  }

  return (x: unknown[]): x is any => {
    if (x.length !== len) return false;
    let i = -1;
    while (++i < len) {
      if (!guards[i](x[i])) return false;
    }
    return true;
  };
}

export function choose<Z>(cases: Array<[any, Z]>): (x: any) => Z {
  const len = cases.length;
  return (x: any) => {
    let i = -1;
    while (++i < len) {
      if (cases[i][0](x)) return cases[i][1];
    }
    throw new Error('No alternatives were matched');
  };
}

export function intersect(guards: Array<Guard<unknown>>): Guard<unknown> {
  const len = guards.length;
  if (len === 1) {
    // Optimization for special case when array has length === 1
    return guards[0];
  }
  return (x: unknown): any => {
    let i = -1;
    while (++i < len) {
      if (!guards[i](x)) return false;
    }
    return true;
  };
}

export function applier(converters: Array<Conversion<unknown, unknown>>): Conversion<unknown[], unknown[]> {
  const len = converters.length;

  // TODO: remove tail nulls from converters

  const hasConversions = converters.some(Boolean);

  if (len === 0 || !hasConversions) {
    // Optimization for special there are no converters
    return null;
  }

  if (len === 1) {
    // Optimization for special there are one converter
    const c = converters[0];
    return (args: unknown[]) => {
      args[0] = c(args[0]);
      return args;
    };
  }

  return (args: unknown[]) => {
    let i = -1;
    while (++i < len) {
      if (converters[i]) args[i] = converters[i](args[i]);
    }
    return args;
  };
}
