/**
 * Haili 物资管理助手
 * 作者：韦永昌（Yonon） | https://github.com/Y0N0N/Yonon-wxStorageManage
 */
// pages/log-detail/index.ts
import { requireAuth } from '../../services/auth.service';
import { LogService, ActivityService, ActivityItemService, MaterialService, parseDate, getWeekDay } from '../../services/storage.service';

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  activity_borrow: { label: '因活动借出', icon: '📋', color: '#D48806' },
  activity_return: { label: '因活动归还', icon: '🔙', color: '#52C41A' },
  material_change: { label: '物资变动', icon: '📦', color: '#4A90D9' },
};

Page({
  data: {
    log: null as WechatMiniprogram.IAnyObject | null,
    typeConfig: {} as WechatMiniprogram.IAnyObject,
    weekDay: '',
    // 关联活动
    activity: null as WechatMiniprogram.IAnyObject | null,
    activityItems: [] as WechatMiniprogram.IAnyObject[],
    // 关联物资
    material: null as WechatMiniprogram.IAnyObject | null,
    loading: true,
  },

  onLoad(options: WechatMiniprogram.PageOption) {
    if (!requireAuth()) return;

    const id = options.id as string;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const allLogs = LogService.findAll();
    const log = allLogs.find(l => l.id === id);
    if (!log) {
      wx.showToast({ title: '日志不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 关联数据
    let activity = null;
    let activityItems: WechatMiniprogram.IAnyObject[] = [];
    let material = null;

    if (log.activityId) {
      const act = ActivityService.findById(log.activityId);
      if (act) {
        activity = {
          ...act,
          statusBadgeClass: act.status === 'returned' ? 'returned'
            : parseDate(act.expectedReturnTime).getTime() < Date.now() && act.status !== 'returned' ? 'overdue' : 'active',
          statusBadgeText: act.status === 'returned' ? '✅ 已归还'
            : parseDate(act.expectedReturnTime).getTime() < Date.now() ? '⚠️ 逾期' : '📤 借出中',
        };
        activityItems = ActivityItemService.findByActivity(act.id);
      }
    }

    material = MaterialService.findById(log.materialId) || null;

    this.setData({
      log,
      typeConfig: TYPE_CONFIG[log.operationType] || { label: '未知', icon: '📋' },
      weekDay: getWeekDay(log.timestamp),
      activity,
      activityItems,
      material,
      loading: false,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
