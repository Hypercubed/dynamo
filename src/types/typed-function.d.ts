type Signatures = {
  [key: string]: Function;
}

interface Create {
  <T>(name: any, signatures?: Signatures): T;
  create: () => Create;
  addType: (type: {name: string, test: Function}) => void;
}

declare module 'typed-function' {
  export const create: () => Create;
}