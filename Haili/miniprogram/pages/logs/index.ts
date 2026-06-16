// pages/logs/index.ts
import { requireAuth } from '../../services/auth.service';
import { LogService, parseDate, getWeekDay } from '../../services/storage.service';

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  activity_borrow: { label: '因活动借出', icon: '📋' },
  activity_return: { label: '因活动归还', icon: '🔙' },
  material_change: { label: '物资变动', icon: '📦' },
};

const TYPE_FILTERS = [
  { key: '', label: '全部' },
  { key: 'activity_borrow', label: '因活动借出' },
  { key: 'activity_return', label: '因活动归还' },
  { key: 'material_change', label: '物资变动' },
];

Page({
  data: {
    logs: [] as WechatMiniprogram.IAnyObject[],
    allLogs: [] as WechatMiniprogram.IAnyObject[],
    typeFilters: TYPE_FILTERS,
    activeFilter: '',
    loading: false,
  },

  onShow() {
    if (!requireAuth()) return;
    this.loadLogs();
  },

  goBack() {
    wx.navigateBack();
  },

  loadLogs() {
    this.setData({ loading: true });

    const logs = LogService.findAll().sort(
      (a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime()
    ).map(log => ({
      ...log,
      ...(TYPE_CONFIG[log.operationType] || { label: '未知', icon: '📋' }),
      weekDay: getWeekDay(log.timestamp),
      // 标题仅显示活动名称
      displayTitle: log.activityName || log.detail,
    }));

    this.setData({
      allLogs: logs,
      logs: this.data.activeFilter
        ? logs.filter(l => l.operationType === this.data.activeFilter)
        : logs,
      loading: false,
    });
  },

  onFilter(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key as string;
    const { allLogs } = this.data;
    this.setData({
      activeFilter: key,
      logs: key ? allLogs.filter(l => l.operationType === key) : allLogs,
    });
  },

  /** 点击日志查看详情 */
  onLogTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/log-detail/index?id=${id}` });
  },
});
