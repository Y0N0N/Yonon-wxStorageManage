// pages/materials/index.ts
import { requireAuth, isAssistant } from '../../services/auth.service';
import { MaterialService } from '../../services/storage.service';

Page({
  data: {
    materials: [] as WechatMiniprogram.IAnyObject[],
    isAssistant: false,
    searchKey: '',
    showSearch: false,
  },

  onShow() {
    if (!requireAuth()) return;
    this.loadData();
  },

  loadData() {
    const materials = MaterialService.findAll().map(m => ({
      ...m,
      stockPercent: m.totalQuantity > 0
        ? Math.round((m.currentStock / m.totalQuantity) * 100)
        : 0,
    }));

    this.setData({
      materials,
      isAssistant: isAssistant(),
    });
  },

  /** 搜索输入 */
  onSearchInput(e: WechatMiniprogram.InputEvent) {
    const key = e.detail.value.toLowerCase();
    this.setData({ searchKey: key });

    const all = MaterialService.findAll();
    const filtered = key
      ? all.filter(m =>
          m.name.toLowerCase().includes(key) ||
          m.category.toLowerCase().includes(key)
        )
      : all;

    this.setData({
      materials: filtered.map(m => ({
        ...m,
        stockPercent: m.totalQuantity > 0
          ? Math.round((m.currentStock / m.totalQuantity) * 100)
          : 0,
      })),
    });
  },

  toggleSearch() {
    this.setData({
      showSearch: !this.data.showSearch,
      searchKey: '',
    });
    if (!this.data.showSearch) {
      this.loadData();
    }
  },

  /** 点击物资 → 编辑（助理）或详情（管理员） */
  onMaterialTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    if (isAssistant()) {
      wx.navigateTo({ url: `/pages/material-edit/index?id=${id}` });
    }
  },

  /** 返回上一页 */
  goBack() {
    wx.navigateBack();
  },

  /** 新增物资（仅助理） */
  onAdd() {
    wx.navigateTo({ url: '/pages/material-edit/index' });
  },
});
