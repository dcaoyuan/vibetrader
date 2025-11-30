// SPDX-License-Identifier: AGPL-3.0-only

type InputOptions =
    | {
        title?: string;
        group?: string;
    }
    | unknown;

//in the current implementation we just declare the input interfaces for compatibility
// in future versions this might be used for visualization
export class Input {
    constructor(private context: unknown) { }

    param(source, index = 0) {
        if (Array.isArray(source)) {
            return [source[index]];
        }
        return [source];
    }

    any(value: unknown, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }

    int(value: number, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }

    float(value: number, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }

    bool(value: boolean, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }

    string(value: string, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    timeframe(value: string, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    time(value: number, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    price(value: number, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    session(value: string, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    source(value: unknown, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    symbol(value: string, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    text_area(value: string, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    enum(value: string, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
    color(value: string, inputOptions: InputOptions = {}) {
        return Array.isArray(value) ? value[0] : value;
    }
}

export default Input;
