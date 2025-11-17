export interface Class<T> {
  new(...args: any[]): T;
}

export function createInstance<T>(clazz: Class<T>, ...args: any[]): T {
  return new clazz(args);
}

