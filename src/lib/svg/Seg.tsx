import type { JSX } from "react";

export interface Seg {
    render(key: string): JSX.Element
}
