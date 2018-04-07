declare module 'typed-function' {
  export const create: () => Create;
}

interface Create {
  <T>(name: any, signatures?: TypedSignatures): T;
  create: () => Create;
  types: Array<{name: string, test: Function}>;
  addType: (type: {name: string, test: Function}) => void;
}

interface TypedSignatures {
  [key: string]: Function;
}

interface SignaturesMap {
  [key: string]: TypedSignatures;
}

interface Constructor {
  new(...args: any[]): any;
  [x: string]: any;
}

type Type = string | Constructor;
