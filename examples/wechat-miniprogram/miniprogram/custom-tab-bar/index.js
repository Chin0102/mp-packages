Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: 'pages/components/index',
        text: '组件',
        icon: 'components',
      },
      {
        pagePath: 'pages/runtime/index',
        text: '运行时',
        icon: 'runtime',
      },
    ],
  },

  methods: {
    switchTab(event) {
      const { index, path } = event.currentTarget.dataset;
      if (index === this.data.selected) return;

      wx.switchTab({ url: `/${path}` });
    },
  },
});
