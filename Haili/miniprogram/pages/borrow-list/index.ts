/**
 * Haili 物资管理助手
 * 作者：韦永昌（Yonon） | https://github.com/Y0N0N/Yonon-wxStorageManage
 */
// pages/borrow-list/index.ts
import { requireAuth, isAssistant } from '../../services/auth.service';
import { ActivityService, ActivityItemService, MaterialService, formatTime, parseDate, getWeekDay } from '../../services/storage.service';
import { logActivityReturn } from '../../services/log.service';

Page({
  data: {
    activities: [] as WechatMiniprogram.IAnyObject[],
    allActivities: [] as WechatMiniprogram.IAnyObject[],
    isAssistant: false,
    tab: 'active',
    // 归还弹窗
    showReturnModal: false,
    returnActivity: null as WechatMiniprogram.IAnyObject | null,
    returnItems: [] as WechatMiniprogram.IAnyObject[],
    receiver: '',
    returnNote: '',
    saving: false,
    // 其他处理弹窗
    showSpecialModal: false,
    specialActivity: null as WechatMiniprogram.IAnyObject | null,
    specialHandler: '',
    specialNote: '',
  },

  onShow() {
    if (!requireAuth()) return;
    this.setData({ isAssistant: isAssistant() });
    this.loadActivities();
  },

  goBack() {
    wx.navigateBack();
  },

  isActiveStatus(status: string): boolean {
    return status === 'active' || status === 'partial' || status === 'special';
  },

  loadActivities() {
    const all = ActivityService.findAll().sort(
      (a, b) => parseDate(b.borrowTime).getTime() - parseDate(a.borrowTime).getTime()
    );

    const now = Date.now();

    const activities = all.map(a => {
      const items = ActivityItemService.findByActivity(a.id);
      const totalBorrowed = items.reduce((s, i) => s + i.quantity, 0);
      const totalReturned = items.reduce((s, i) => s + i.returnedQuantity, 0);
      const isOverdue = this.isActiveStatus(a.status)
        && parseDate(a.expectedReturnTime).getTime() < now;

      let statusBadgeClass = 'returned';
      let statusBadgeText = '✅ 已归还';
      if (a.status === 'returned' || a.status === 'resolved') {
        statusBadgeClass = 'returned';
        statusBadgeText = a.status === 'resolved' ? '🔘 已处理' : '✅ 已归还';
      } else if (a.status === 'special') {
        statusBadgeClass = 'special';
        statusBadgeText = '🔶 特殊';
      } else if (isOverdue) {
        statusBadgeClass = 'overdue';
        statusBadgeText = '⚠️ 逾期';
      } else {
        statusBadgeClass = 'active';
        statusBadgeText = '📤 借出中';
      }

      return {
        ...a,
        items,
        totalBorrowed,
        totalReturned,
        isOverdue,
        weekDay: getWeekDay(a.borrowTime),
        statusBadgeClass,
        statusBadgeText,
      };
    });

    this.setData({
      allActivities: activities,
      activities: this.data.tab === 'active'
        ? activities.filter(a => this.isActiveStatus(a.status))
        : activities,
    });
  },

  switchTab(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as string;
    const activities = tab === 'active'
      ? this.data.allActivities.filter((a: WechatMiniprogram.IAnyObject) => this.isActiveStatus(a.status))
      : this.data.allActivities;
    this.setData({ tab, activities });
  },

  // ============================================================
  // 归还
  // ============================================================
  openReturn(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const activity = this.data.allActivities.find((a: WechatMiniprogram.IAnyObject) => a.id === id);
    if (!activity) return;

    const returnItems = activity.items.map((item: WechatMiniprogram.IAnyObject) => ({
      ...item,
      returnQty: item.quantity - item.returnedQuantity,
      maxReturn: item.quantity - item.returnedQuantity,
    }));

    this.setData({
      showReturnModal: true,
      returnActivity: activity,
      returnItems,
      receiver: '',
      returnNote: '',
    });
  },

  closeReturn() {
    this.setData({ showReturnModal: false, returnActivity: null, returnItems: [] });
  },

  onReturnQtyInput(e: WechatMiniprogram.InputEvent) {
    const id = e.currentTarget.dataset.id as string;
    const val = parseInt(e.detail.value, 10);
    const items = this.data.returnItems.map((item: WechatMiniprogram.IAnyObject) => {
      if (item.id === id) return { ...item, returnQty: isNaN(val) ? 0 : val };
      return item;
    });
    this.setData({ returnItems: items });
  },

  onReceiverInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ receiver: e.detail.value });
  },

  onReturnNoteInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ returnNote: e.detail.value });
  },

  confirmReturn() {
    const { returnActivity, returnItems, receiver, returnNote } = this.data;
    if (!returnActivity) return;
    if (!receiver.trim()) { wx.showToast({ title: '请输入接收人', icon: 'none' }); return; }

    for (const item of returnItems) {
      if (item.returnQty < 0 || item.returnQty > item.maxReturn) {
        wx.showToast({ title: `${item.materialName} 归还数量有误`, icon: 'none' });
        return;
      }
    }

    const hasReturn = returnItems.some((item: WechatMiniprogram.IAnyObject) => item.returnQty > 0);
    if (!hasReturn) { wx.showToast({ title: '请填写归还数量', icon: 'none' }); return; }

    this.setData({ saving: true });
    const now = formatTime();
    let allFullyReturned = true;
    const returnedSummaryParts: string[] = [];

    for (const item of returnItems) {
      if (item.returnQty <= 0) {
        if (item.quantity - item.returnedQuantity > 0) allFullyReturned = false;
        continue;
      }
      const newReturned = item.returnedQuantity + item.returnQty;
      ActivityItemService.update(item.id, { returnedQuantity: newReturned });
      const material = MaterialService.findById(item.materialId);
      if (material) {
        MaterialService.update(material.id, {
          currentStock: material.currentStock + item.returnQty,
          updatedAt: now,
        });
      }
      if (newReturned < item.quantity) allFullyReturned = false;
      returnedSummaryParts.push(`${item.materialName}×${item.returnQty}${item.unit}`);
    }

    const newStatus = allFullyReturned ? 'returned' : 'partial';
    ActivityService.update(returnActivity.id, { status: newStatus, actualReturnTime: now, extraNote: returnNote });

    logActivityReturn(
      { ...returnActivity, status: newStatus },
      returnedSummaryParts.join('、'),
      receiver.trim(),
    );

    wx.showToast({ title: '归还成功', icon: 'success' });
    this.setData({ saving: false });
    this.closeReturn();
    this.loadActivities();
  },

  // ============================================================
  // 其他处理
  // ============================================================
  openSpecial(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const activity = this.data.allActivities.find((a: WechatMiniprogram.IAnyObject) => a.id === id);
    if (!activity) return;

    this.setData({
      showSpecialModal: true,
      specialActivity: activity,
      specialHandler: '',
      specialNote: '',
    });
  },

  closeSpecial() {
    this.setData({ showSpecialModal: false, specialActivity: null });
  },

  onSpecialHandlerInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ specialHandler: e.detail.value });
  },

  onSpecialNoteInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ specialNote: e.detail.value });
  },

  markSpecial() {
    const { specialActivity, specialHandler, specialNote } = this.data;
    if (!specialActivity) return;
    if (!specialHandler.trim()) { wx.showToast({ title: '请输入处理人', icon: 'none' }); return; }

    ActivityService.update(specialActivity.id, { status: 'special', handler: specialHandler.trim(), extraNote: specialNote.trim() });
    wx.showToast({ title: '已标记为特殊', icon: 'success' });
    this.closeSpecial();
    this.loadActivities();
  },

  markResolved() {
    const { specialActivity, specialHandler, specialNote } = this.data;
    if (!specialActivity) return;
    if (!specialHandler.trim()) { wx.showToast({ title: '请输入处理人', icon: 'none' }); return; }

    ActivityService.update(specialActivity.id, { status: 'resolved', handler: specialHandler.trim(), extraNote: specialNote.trim() });
    wx.showToast({ title: '已标记为已处理', icon: 'success' });
    this.closeSpecial();
    this.loadActivities();
  },
});
