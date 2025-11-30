import { describe, expect, it } from 'vitest';

import { transpile } from "../src/transpiler";

export { result2 }
const fakeContext = {};
const transformer = transpile.bind(fakeContext);

const source = (context) => {
  const { close } = context.data;
  const _cc = close;

  let aa = 0;

  if (_cc > 1) {
    let bb = 1;
    let cc = close;
    let dd = close[1];
    let ee = close[aa];
    let ff = close[aa[99]];

    let cc0 = _cc;
    let cc1 = _cc[1];
    let cc2 = _cc[aa];
    let cc3 = _cc[aa[99]];

    aa = 1;
  }
  if (_cc[0] > 1) {
    aa = 2;
  }
  if (_cc[1] > 1) {
    aa = 3;
  }
  if (_cc[aa] > 1) {
    aa = 3;
  }
  if (_cc[aa[0]] > 1) {
    aa = 3;
  }
  if (_cc[aa[1]] > 1) {
    aa = 3;
  }
  if (close > 1) {
    aa = 4;
  }
  if (close[0] > 1) {
    aa = 5;
  }
  if (close[1] > 1) {
    aa = 6;
  }
  if (close[aa] > 1) {
    aa = 6;
  }
  if (close[aa[1]] > 1) {
    aa = 6;
  }
};
const transpiled = transformer(source);

const result2 = transpiled.toString().trim();
console.log(result2.match(/;/g).length)
console.log('out test:', result2);


// describe('Transpiler', () => {

//   it('Conditions', () => {
//     const fakeContext = {};
//     const transformer = transpile.bind(fakeContext);

//     const source = (context) => {
//       const { close } = context.data;
//       const _cc = close;

//       let aa = 0;

//       if (_cc > 1) {
//         let bb = 1;
//         let cc = close;
//         let dd = close[1];
//         let ee = close[aa];
//         let ff = close[aa[99]];

//         let cc0 = _cc;
//         let cc1 = _cc[1];
//         let cc2 = _cc[aa];
//         let cc3 = _cc[aa[99]];

//         aa = 1;
//       }
//       if (_cc[0] > 1) {
//         aa = 2;
//       }
//       if (_cc[1] > 1) {
//         aa = 3;
//       }
//       if (_cc[aa] > 1) {
//         aa = 3;
//       }
//       if (_cc[aa[0]] > 1) {
//         aa = 3;
//       }
//       if (_cc[aa[1]] > 1) {
//         aa = 3;
//       }
//       if (close > 1) {
//         aa = 4;
//       }
//       if (close[0] > 1) {
//         aa = 5;
//       }
//       if (close[1] > 1) {
//         aa = 6;
//       }
//       if (close[aa] > 1) {
//         aa = 6;
//       }
//       if (close[aa[1]] > 1) {
//         aa = 6;
//       }
//     };
//     const transpiled = transformer(source);

//     const result = transpiled.toString().trim();
//     console.log('in test:', result2);

//     /* prettier-ignore */
//     const expected_code = `$ => {
//   const {close} = $.data;
//   $.const.glb1__cc = $.init($.const.glb1__cc, close);
//   $.let.glb1_aa = $.init($.let.glb1_aa, 0);
//   if ($.const.glb1__cc[0] > 1) {
//     $.let.if2_bb = $.init($.let.if2_bb, 1);
//     $.let.if2_cc = $.init($.let.if2_cc, close);
//     $.let.if2_dd = $.init($.let.if2_dd, close, 1);
//     $.let.if2_ee = $.init($.let.if2_ee, close, $.let.glb1_aa[0]);
//     $.let.if2_ff = $.init($.let.if2_ff, close, $.let.glb1_aa[99]);
//     $.let.if2_cc0 = $.init($.let.if2_cc0, $.const.glb1__cc, 0);
//     $.let.if2_cc1 = $.init($.let.if2_cc1, $.const.glb1__cc, 1);
//     $.let.if2_cc2 = $.init($.let.if2_cc2, $.const.glb1__cc, $.let.glb1_aa[0]);
//     $.let.if2_cc3 = $.init($.let.if2_cc3, $.const.glb1__cc, $.let.glb1_aa[99]);
//     $.let.glb1_aa[0] = 1;
//   }
//   if ($.const.glb1__cc[0] > 1) {
//     $.let.glb1_aa[0] = 2;
//   }
//   if ($.const.glb1__cc[1] > 1) {
//     $.let.glb1_aa[0] = 3;
//   }
//   if ($.const.glb1__cc[$.let.glb1_aa[0]] > 1) {
//     $.let.glb1_aa[0] = 3;
//   }
//   if ($.const.glb1__cc[$.let.glb1_aa[0]] > 1) {
//     $.let.glb1_aa[0] = 3;
//   }
//   if ($.const.glb1__cc[$.let.glb1_aa[1]] > 1) {
//     $.let.glb1_aa[0] = 3;
//   }
//   if (close[0] > 1) {
//     $.let.glb1_aa[0] = 4;
//   }
//   if (close[0] > 1) {
//     $.let.glb1_aa[0] = 5;
//   }
//   if (close[1] > 1) {
//     $.let.glb1_aa[0] = 6;
//   }
//   if (close[$.let.glb1_aa[0]] > 1) {
//     $.let.glb1_aa[0] = 6;
//   }
//   if (close[$.let.glb1_aa[1]] > 1) {
//     $.let.glb1_aa[0] = 6;
//   }
// }`;

//     expect(result2).toBe(expected_code);
//   });

// })