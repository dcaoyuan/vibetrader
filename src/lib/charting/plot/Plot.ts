import type { PineData } from "../../domain/PineData";

export type Plot = {
    data: PineData[],
    options: PlotOptions,
    title: string,
    _plotKey: string,
}

// export type PlotCharOptions = {
//     title?: string;
//     char?: string;
//     location?: Location;
//     color?: string;
//     offset?: number;
//     text?: string;
//     textcolor?: string;
//     editable?: boolean;
//     size?: number;
//     show_last?: boolean;
//     display?: boolean;
//     format?: string;
//     precision?: number;
//     force_overlay?: boolean;
//     style?: string // added by me, may need to remove
// };

export type PlotOptions = {
    _plotKey?: string;
    series?: number;
    title?: string;
    plot1?: string | number; // will be converted number atIndex 
    plot2?: string | number; // will be converted number atIndex 
    color?: string;
    linewidth?: number;
    linestyle?: string;
    style?: string;
    trackprice?: boolean;
    histbase?: boolean;
    offset?: number;
    join?: boolean;
    editable?: boolean;
    show_last?: boolean;
    display?: boolean;
    format?: string;
    precision?: number;
    force_overlay?: boolean;
    fillgaps?: boolean;
    text?: string;
    textcolor?: string;
    char?: string;
    shape?: string;
    size?: string;
    location?: Location; // added by me, may need to remove
};

// export type PlotShapeOptions = {
//     series?: number;
//     title?: string;
//     _plotKey?: string;
//     style?: string;
//     shape?: string;
//     location?: Location;
//     color?: string;
//     offset?: number;
//     text?: string;
//     textcolor?: string;
//     editable?: boolean;
//     size?: string;
//     show_last?: number;
//     display?: string;
//     format?: string;
//     precision?: number;
//     force_overlay?: boolean;
// }

export type Location = 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute'

export type Shape =
    'xcross' |
    'cross' |
    'circle' |
    'triangleup' |
    'triangledown' |
    'flag' |
    'arrowup' |
    'arrowdown' |
    'square' |
    'diamond' |
    'labelup' |
    'labeldown'
