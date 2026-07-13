import { getSystemInfo } from '@chin0102/mp-adapter';

import { getPageBottomHeight } from '../layout.js';

Component({
  options: {
    styleIsolation: 'isolated',
  },

  externalClasses: ['custom-class'],

  properties: {
    append: {
      type: Number,
      value: 0,
    },
    min: {
      type: Number,
      value: 0,
    },
    customStyle: {
      type: String,
      value: '',
    },
  },

  data: {
    spacerStyle: '',
  },

  observers: {
    'append,min'() {
      if (this._mpPageBottomAttached) this.updateHeight();
    },
  },

  lifetimes: {
    attached() {
      this._mpPageBottomAttached = true;
      this.updateHeight();
    },
  },

  methods: {
    updateHeight() {
      const height = getPageBottomHeight(getSystemInfo(), this.data.min, this.data.append);
      this.setData({ spacerStyle: `height:${height}rpx;` });
    },
  },
});
