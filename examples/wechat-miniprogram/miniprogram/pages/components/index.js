const { definePage } = require('@chin0102/mp-core');

Page(
  definePage({
    data: {
      countdownDuration: 15000,
      countdownMode: 'duration',
      countdownPaused: false,
      countdownStatus: '倒计时进行中',
      countdownTargetTime: 0,
      countdownTick: '15.0 秒',
      dialogCustom: false,
      dialogVisible: false,
      lastAction: '尚未操作',
      overlayVisible: false,
      popupPosition: 'bottom',
      popupVisible: false,
    },

    restartCountdown() {
      const countdownTargetTime = this.data.countdownMode === 'target' ? Date.now() + 15000 : 0;
      this.setData({
        countdownPaused: false,
        countdownStatus: '倒计时进行中',
        countdownTargetTime,
      });
      this.selectComponent('#demo-countdown').reset();
    },

    toggleCountdown() {
      const countdownPaused = !this.data.countdownPaused;
      this.setData({
        countdownPaused,
        countdownStatus: countdownPaused ? '倒计时已暂停' : '倒计时进行中',
      });
    },

    switchCountdownMode() {
      const countdownMode = this.data.countdownMode === 'duration' ? 'target' : 'duration';
      this.setData({
        countdownMode,
        countdownPaused: false,
        countdownStatus: countdownMode === 'target' ? '绝对时间倒计时' : '时长倒计时',
        countdownTargetTime: countdownMode === 'target' ? Date.now() + 15000 : 0,
      });
    },

    handleCountdownTick(event) {
      this.setData({ countdownTick: `${(event.detail.remaining / 1000).toFixed(1)} 秒` });
    },

    handleCountdownFinish() {
      this.setData({ countdownStatus: '倒计时完成', countdownTick: '0.0 秒' });
    },

    openOverlay() {
      this.setData({ overlayVisible: true });
    },

    closeOverlay() {
      this.setData({ overlayVisible: false, lastAction: '关闭 overlay' });
    },

    openPopup(event) {
      this.setData({ popupPosition: event.currentTarget.dataset.position, popupVisible: true });
    },

    closePopup(event) {
      const source = event?.detail?.source || 'button';
      this.setData({ popupVisible: false, lastAction: `关闭 ${this.data.popupPosition} popup：${source}` });
    },

    openDialog(event) {
      this.setData({ dialogCustom: event.currentTarget.dataset.mode === 'custom', dialogVisible: true });
    },

    closeDialog(event) {
      const source = event?.detail?.source || 'custom-footer';
      this.setData({ dialogVisible: false, lastAction: `关闭 dialog：${source}` });
    },
  }),
);
