type Signatures = {
  [key: string]: Function;
}

interface Create {
  (name: any, signatures?: Signatures): any;
  create: () => Create;
  addType: (type: {name: string, test: Function}) => void;
}

declare module 'typed-function' {
  export const create: () => Create;
}