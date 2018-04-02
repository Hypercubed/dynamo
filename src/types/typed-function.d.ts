interface Signatures {
  [key: string]: Function;
}

interface Constructor<T> {
  new(): T;
}

interface Create {
  <T>(name: any, signatures?: Signatures): T;
  create: () => Create;
  addType: (type: {name: string, test: Function}) => void;
}

declare module 'typed-function' {
  export const create: () => Create;
}