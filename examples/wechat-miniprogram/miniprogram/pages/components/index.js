Page({
  data: {
    countdownStatus: '倒计时进行中',
    dialogVisible: false,
    lastAction: '尚未操作',
    overlayVisible: false,
    popupVisible: false,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 0 });
  },

  restartCountdown() {
    this.setData({ countdownStatus: '倒计时进行中' });
    this.selectComponent('#demo-countdown').reset();
  },

  handleCountdownFinish() {
    this.setData({ countdownStatus: '倒计时完成' });
  },

  openOverlay() {
    this.setData({ overlayVisible: true });
  },

  closeOverlay() {
    this.setData({ overlayVisible: false, lastAction: '关闭 overlay' });
  },

  openPopup() {
    this.setData({ popupVisible: true });
  },

  closePopup(event) {
    const source = event?.detail?.source || 'button';
    this.setData({ popupVisible: false, lastAction: `关闭 popup：${source}` });
  },

  openDialog() {
    this.setData({ dialogVisible: true });
  },

  closeDialog(event) {
    const source = event?.detail?.source || 'unknown';
    this.setData({ dialogVisible: false, lastAction: `关闭 dialog：${source}` });
  },
});
