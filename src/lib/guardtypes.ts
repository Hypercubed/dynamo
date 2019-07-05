import { guard } from './decorators';

export function create<T>(_guard: Guard<T>, _name?: string) {
  class GuardToken {
    static guard = _guard;
  }

  if (_name) {
    Object.defineProperty(GuardToken, 'name', { value: _name });
  }
  
  guard()(GuardToken, 'guard');
  return GuardToken;
}

// tslint:disable-next-line:variable-name
export const Unknown = create<any>((x: unknown): x is any => true, 'Unknown');

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

function intersect(guards: Array<Guard<unknown>>): any {
  return (x: unknown): any => {
    for (let i = 0; i < guards.length; i++) {
      if (!guards[i](x)) return false;
    }
    return true;
  };
}
