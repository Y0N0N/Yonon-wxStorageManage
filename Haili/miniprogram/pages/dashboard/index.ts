/**
 * Haili 物资管理助手
 * 作者：韦永昌（Yonon） | https://github.com/Y0N0N/Yonon-wxStorageManage
 */
// pages/dashboard/index.ts
import { getCurrentUser, isAdmin, isAssistant, requireAuth } from '../../services/auth.service';
import { MaterialService, ActivityService, LogService } from '../../services/storage.service';

Page({
  data: {
    user: null as WechatMiniprogram.IAnyObject | null,
    isAdmin: false,
    isAssistant: false,
    stats: {
      totalMaterials: 0,       // 物资种类数
      totalInStock: 0,         // 在库总数
      totalBorrowed: 0,        // 已借出总数
      overdueCount: 0,         // 逾期记录数
    },
    categoryStats: [] as { category: string; count: number; stock: number }[],
    recentLogs: [] as WechatMiniprogram.IAnyObject[],
  },

  onShow() {
    // 权限守卫
    if (!requireAuth()) return;

    this.loadData();
  },

  /** 加载看板数据 */
  loadData() {
    const user = getCurrentUser();
    const materials = MaterialService.findAll();
    const totalStock = MaterialService.getTotalStock();
    const activeActivities = ActivityService.findAll().filter(
      a => a.status === 'active' || a.status === 'partial' || a.status === 'special'
    ).length;
    const overdueCount = ActivityService.countOverdue();

    this.setData({
      user,
      isAdmin: isAdmin(),
      isAssistant: isAssistant(),
      stats: {
        activeActivities,
        overdueCount,
      },
      categoryStats: MaterialService.getCategoryStats(),
      recentLogs: LogService.getRecent(8).map(log => ({
        ...log,
        icon: this.getLogIcon(log.operationType),
      })),
    });
  },

  /** 获取日志图标 */
  getLogIcon(type: string): string {
    const map: Record<string, string> = {
      activity_borrow: '📋',   // 清单→借出
      activity_return: '🔙',   // 返回→归还
      material_change: '📦',   // 物资变动
    };
    return map[type] || '📋';
  },

  // ============================================================
  // 导航
  // ============================================================

  goToMaterials() {
    wx.navigateTo({ url: '/pages/materials/index' });
  },

  goToBorrow() {
    wx.navigateTo({ url: '/pages/borrow/index' });
  },

  goToBorrowList() {
    wx.navigateTo({ url: '/pages/borrow-list/index' });
  },

  goToLogs() {
    wx.navigateTo({ url: '/pages/logs/index' });
  },

  goToUsers() {
    wx.navigateTo({ url: '/pages/users/index' });
  },

  /** 注销 */
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const { logout } = require('../../services/auth.service');
          logout();
          wx.redirectTo({ url: '/pages/login/index' });
        }
      },
    });
  },
});
