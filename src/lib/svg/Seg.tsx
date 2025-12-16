import type { JSX } from "react";
import type { Key } from "react-aria-components";

export type Style = {
    fill?: string,
    stroke?: string,
    strokeWidth?: string | number,
    strokeDasharray?: string | number,
    opacity?: number
}

export type Options = {
    key?: Key
    style?: Style
    className?: string
}

export interface Seg {
    render(options: Options): JSX.Element
}
