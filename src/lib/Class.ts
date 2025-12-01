export interface Class<T> {
    new(...args: unknown[]): T;
}

export function createInstance<T>(clazz: Class<T>, ...args: unknown[]): T {
    return new clazz(args);
}

