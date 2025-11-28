$ => {
  const ta = $.ta;
  const { close } = $.data;
  $.const.glb1_ema9 = $.init($.const.glb1_ema9, ta.ema(ta.param(close, undefined, 'p0'), ta.param(9, undefined, 'p1'), "_ta0"));
  $.const.glb1_ema18 = $.init($.const.glb1_ema18, ta.ema(ta.param(close, undefined, 'p2'), ta.param(18, undefined, 'p3'), "_ta1"));
  $.const.glb1_bull_bias = $.init($.const.glb1_bull_bias, $.const.glb1_ema9[0] > $.const.glb1_ema18[0]);
  $.const.glb1_bear_bias = $.init($.const.glb1_bear_bias, $.const.glb1_ema9[0] < $.const.glb1_ema18[0]);
  return {
    bull_bias: $.const.glb1_bull_bias,
    bear_bias: $.const.glb1_bear_bias
  };
}

$.const.gl