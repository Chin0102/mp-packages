import { getSystemInfo } from '@chin0102/mp-adapter';

import { createNavigationLayout } from '../layout.js';

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'isolated',
  },

  externalClasses: ['custom-class', 'content-class', 'background-class'],

  properties: {
    fixed: {
      type: Boolean,
      value: false,
    },
    placeholder: {
      type: Boolean,
      value: false,
    },
    zIndex: {
      type: Number,
      value: 10,
    },
    customStyle: {
      type: String,
      value: '',
    },
    paddingLeft: {
      type: Number,
      value: -1,
    },
    pdLeft: {
      type: Number,
      value: -1,
    },
  },

  data: {
    navigationStyle: '',
    contentStyle: '',
    placeholderStyle: '',
  },

  observers: {
    'paddingLeft,pdLeft'() {
      if (this._mpNavigationAttached) this.updateLayout();
    },
  },

  lifetimes: {
    attached() {
      this._mpNavigationAttached = true;
      this.updateLayout();
    },
  },

  methods: {
    updateLayout() {
      const paddingLeft = this.data.paddingLeft >= 0 ? this.data.paddingLeft : this.data.pdLeft;
      const layout = createNavigationLayout(getSystemInfo(), paddingLeft);
      this.setData({
        navigationStyle: layout.navigationStyle,
        contentStyle: layout.contentStyle,
        placeholderStyle: layout.placeholderStyle,
      });
    },
  },
});
