/**
 * Waseda Baseball Scorebook 23 Classic Examples
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global.WasedaExamples = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EXAMPLES = [
    {
      id: 1,
      title: "圖 (1)：中間方向平飛一壘安打",
      description: "打者在 2 好 2 壞後，擊出中外野方向平飛一壘安打安全上壘。",
      data: {
        pitches: ['called_strike', 'ball', 'foul', 'ball', 'put_in_play'],
        paths: { first: true },
        notations: {
          first: { text: "1B 8", trajectory: "line" }
        }
      }
    }
  ];

  return {
    EXAMPLES
  };
}));