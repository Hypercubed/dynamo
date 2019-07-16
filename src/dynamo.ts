/// <reference path="./index.d.ts" />
import 'reflect-metadata';
import {
  META_METHODS, META_GUARDS, META_CONVERSIONS,
  SignatureMap, GuardMap, ConversionMap
} from './decorators';
import { Converter, union, tuple, matcher, intersect, mapper, identity } from './guards';
import { defaultTypes } from './types';
import { UniversalWeakMap } from './universal-weak-map';

interface Case extends Converter {
  method: AnyFunction;
}

interface DynamoOptions {
  types: any;
  autoadd: boolean;
}

interface TypeData {
  id: string;
  name: string;
  tests: Is[];
  conversions: Converter[];
}

const defaultOptions: DynamoOptions = {
  types: defaultTypes,
  autoadd: false
};

let _id = 0;
function nextId() {
  return `type-${_id++}`;
}

export class Dynamo {
  private typeData = new UniversalWeakMap<TypeData>(); 

  constructor(private options?: Partial<DynamoOptions>) {
    this.options = {
      ...defaultOptions,
      ...options
    };
    if (this.options.types) {
      if (Array.isArray(this.options.types)) {
        this.add(...this.options.types);
      } else {
        this.add(this.options.types);
      }
    }

    this.add = this.add.bind(this);
  }

  add(...ctors: Type[]): void {
    ctors.forEach(c => {
      this.addTypes(c);
      this.addConversions(c);      
    });
  }

  function<T extends Constructor<any>>(ctor: T): FunctionProperties<InstanceType<T>> {
    const target = new ctor();
    const name = 'name' in target ? target.name : ctor.name;

    const map: SignatureMap = Reflect.getMetadata(META_METHODS, target);

    if (!map || Object.keys(map).length < 0) {
      throw new Error('No signatures provided');
    }

    let maxLength = 0;
    const cases: Case[] = [];

    for (const key in map) {
      const signatures = map[key];
      signatures.forEach(signature => {
        maxLength = Math.max(maxLength, signature.length);
        const unions = signature.map(t => this.convertParamToUnion(t));
        cases.push({
          id: '',
          ...tuple(unions),
          convert: mapper(unions.map(x => x.convert)),
          method: target[key]
        });
      });
    }

    const fn = makeFunction(cases, maxLength);

    if (fn.length !== maxLength) {
      Object.defineProperty(fn, 'length', { value: maxLength });
    }

    Object.defineProperty(fn, 'name', { value: name });
    return fn as any;
  }

  /**
   * Given a type param, returns the runtype
   * Arrays are converted to intersections
   * 
   */
  private convertParamToUnion(types: Type[]): Converter {
    const cons: Converter[] = types.map(type => {
      const data = this.getTypeData(type);
      return {
        ...data,
        test: intersect(data.tests),
        convert: identity
      };
    });

    const typeIds = cons.map(c => c.id);

    types.forEach(toType => {
      const typeData = this.typeData.get(toType);
      if (typeData) {
        const conversions = typeData.conversions || [];
        conversions.forEach(conversion => {
          if (!typeIds.includes(conversion.id)) {
            cons.push(conversion);
          }
        });
      }
    });

    return {
      id: '',
      ...union(cons),
      convert: cons.length === types.length ? identity : matcher(cons)
    };
  }

  private getTypeData(type: Type): TypeData {
    const name = getName(type);
    if (!this.typeData.has(type)) {
      if (!this.options.autoadd) {
        throw new TypeError(`Unknown type "${name}"`);
      }
      this.addTypes(type);
    }
    return this.typeData.get(type);
  }

  private addTypes(ctor: Type) {
    const map: GuardMap = Reflect.getMetadata(META_GUARDS, ctor);

    if (map) {
      for (const key in map) {
        const type = map[key] === '' ? ctor : map[key];
        const data = this.typeData.get(type) || { id: nextId(), name: getName(type), tests: [], conversions: [] };
        // @ts-ignore
        const test = ctor[key];
        this.typeData.set(type, {
          ...data,
          tests: [ ...(data.tests || []), test ]
        });
      }
    } else if (this.options.autoadd && typeof ctor === 'function') {
      const test = (x: unknown): x is typeof ctor => x instanceof ctor;
      this.typeData.set(ctor, {
        id: nextId(),
        name: getName(ctor),
        tests: [test],
        conversions: null
      });
    }
    return this;
  }

  private addConversions(ctor: Type) {
    const map: ConversionMap = Reflect.getMetadata(META_CONVERSIONS, ctor) || {};
    for (const key in map) {
      const { fromType, toType } = map[key];

      const fromTypeData = this.getTypeData(fromType);
      const toTypeData = this.getTypeData(toType);

      const conversion: Converter = {
        ...fromTypeData,
        test: intersect(fromTypeData.tests),
        // @ts-ignore
        convert: ctor[key]
      };

      const conversions = toTypeData.conversions || [];
      const data: TypeData = {
        ...toTypeData,
        conversions: [ ...conversions, conversion ]
      };
      this.typeData.set(toType, data);
    }
  }
}

function getName(token: Type | Type[]): string {
  if (token === null || typeof token === 'undefined') {
    return String(token);
  }
  try {
    return ('name' in token && typeof token.name === 'string') ? token.name : 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

function makeFunction(cases: Case[], maxLength: number): AnyFunction {
  // Todo Optimizations:
  // When min = max, skip length checks?
  // optimized functions for sigs < 6, skip choose
  // const len = guards.length;
  const methods = cases.map(g => g.method);

  if (maxLength === 0) {
    // Special case when the function is a nullary
    // no guards or conversions possible
    // not very usefull anyway
    const m0 = methods[0];
    return function(this: any) {
      if (arguments.length > 0) {
        throw new Error(`Expected 0 arguments, but got ${arguments.length}`);
      }
      return m0.call(this);
    };
  }

  const description = cases.map(g => g.name).join(' or ');
  const tests = cases.map(g => g.test);
  const converters = cases.map(g => g.convert);

  const n = tests.length - 1;
  const startAt = tests.length % 4;
  return function(this: any, ...args: unknown[]) {
    let i = -1;

    switch(startAt) {
      case 0: if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
      case 3: if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
      case 2: if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
      case 1: if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
    }

    while (i < n) {
      if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
      if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
      if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
      if (tests[++i](args)) return methods[i].apply(this, converters[i](args));
    }

    throw new TypeError(`Unexpected type of arguments. Expected ${description}.`);
  };
}
