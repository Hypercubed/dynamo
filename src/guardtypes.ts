import { guard } from './decorators';

export class Unknown {
  @guard()
  static isUnknown(x: unknown): x is unknown {
    return true;
  }
}

export function union(guards: Array<Guard<unknown>>) {
  return (x: unknown): boolean => {
    for (const g of guards) if (g(x)) return true;
    return false;
  };
}

export function matcher(guards: Array<Guard<unknown>>, converters: Conversion[]) {
  return (x: any) => {
    for (let i = 0; i < guards.length; i++) {
      if (guards[i](x)) {
        return converters[i](x);
      }
    }
  };
}

export function tuple(guards: Array<Guard<unknown>>): Guard<unknown> {
  const { length } = guards;
  const lguard = (x: any[]): x is any => x.length === length;

  // optimization when length is zero
  if (length === 0) {
    return lguard;
  }

  const _tuple = (x: unknown[]): x is any => {
    for (let i = 0; i < length; i++) {
      if (!guards[i](x[i])) return false;
    }
    return true;
  };

  return intersect([lguard, _tuple]);
}

export function choose<Z>(cases: Array<[any, Z]>): (x: any) => Z {
  return (x: any) => {
    for (const [g, f] of cases) if (g(x)) return f;
    throw new Error('No alternatives were matched');
  };
}

export function intersect(guards: Array<Guard<unknown>>): Guard<unknown> {
  // Optimization for special case when array has length === 1
  if (guards.length === 1) {
    return guards[0];
  }
  return (x: unknown): any => {
    for (let i = 0; i < guards.length; i++) {
      if (!guards[i](x)) return false;
    }
    return true;
  };
}
