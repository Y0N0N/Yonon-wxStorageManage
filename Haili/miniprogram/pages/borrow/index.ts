// pages/borrow/index.ts
import { requireAuth, isAssistant, getCurrentUser } from '../../services/auth.service';
import { MaterialService, ActivityService, ActivityItemService, generateId, formatTime, formatDate } from '../../services/storage.service';
import { logActivityBorrow } from '../../services/log.service';

Page({
  data: {
    materials: [] as WechatMiniprogram.IAnyObject[],
    form: {
      activityName: '',
      holdDate: '',
      organizer: '',
      borrower: '',
      note: '',
      contactPerson: '',
      contactPhone: '',
      responsiblePerson: '',
      expectedReturnDate: '',
      extraNote: '',
    },
    selectedMaterials: [] as {
      id: string;
      materialId: string;
      materialName: string;
      quantity: number;
      maxQuantity: number;
      unit: string;
    }[],
    showPicker: false,
    saving: false,
  },

  onLoad() {
    if (!requireAuth()) return;
    if (!isAssistant()) {
      wx.showToast({ title: '无借出权限', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.loadMaterials();
    // 默认日期
    const today = formatDate(new Date());
    this.setData({
      'form.holdDate': today,
      'form.expectedReturnDate': formatDate(new Date(Date.now() + 7 * 86400000)),
    });
  },

  goBack() {
    wx.navigateBack();
  },

  loadMaterials() {
    const materials = MaterialService.findAll().filter(m => m.currentStock > 0);
    this.setData({ materials });
  },

  // ============================================================
  // 表单输入
  // ============================================================
  onFieldInput(e: WechatMiniprogram.InputEvent) {
    const field = e.currentTarget.dataset.field as string;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  /** 举办时间 picker */
  onHoldDateChange(e: WechatMiniprogram.TouchEvent) {
    this.setData({ 'form.holdDate': (e as any).detail.value });
  },

  /** 预计归还日期 picker */
  onReturnDateChange(e: WechatMiniprogram.TouchEvent) {
    this.setData({ 'form.expectedReturnDate': (e as any).detail.value });
  },

  // ============================================================
  // 物资选择器
  // ============================================================
  togglePicker() {
    this.setData({ showPicker: !this.data.showPicker });
  },

  selectMaterial(e: WechatMiniprogram.TouchEvent) {
    const materialId = e.currentTarget.dataset.id as string;
    const material = this.data.materials.find(m => m.id === materialId);
    if (!material) return;

    const existing = this.data.selectedMaterials.find(m => m.materialId === materialId);
    if (existing) {
      wx.showToast({ title: '已添加该物资', icon: 'none' });
      this.setData({ showPicker: false });
      return;
    }

    const newItem = {
      id: generateId(),
      materialId: material.id,
      materialName: material.name,
      quantity: 1,
      maxQuantity: material.currentStock,
      unit: material.unit,
    };

    this.setData({
      selectedMaterials: [...this.data.selectedMaterials, newItem],
      showPicker: false,
    });
  },

  onSelectedQuantityInput(e: WechatMiniprogram.InputEvent) {
    const id = e.currentTarget.dataset.id as string;
    const val = parseInt(e.detail.value, 10);
    const items = this.data.selectedMaterials.map(item => {
      if (item.id === id) return { ...item, quantity: isNaN(val) ? 0 : val };
      return item;
    });
    this.setData({ selectedMaterials: items });
  },

  removeSelected(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    this.setData({
      selectedMaterials: this.data.selectedMaterials.filter(item => item.id !== id),
    });
  },

  // ============================================================
  // 提交
  // ============================================================
  onSubmit() {
    const { form, selectedMaterials } = this.data;

    if (!form.activityName.trim()) { wx.showToast({ title: '请输入活动名称', icon: 'none' }); return; }
    if (!form.holdDate.trim()) { wx.showToast({ title: '请选择举办时间', icon: 'none' }); return; }
    if (!form.organizer.trim()) { wx.showToast({ title: '请输入主办单位', icon: 'none' }); return; }
    if (!form.borrower.trim()) { wx.showToast({ title: '请输入申请单位', icon: 'none' }); return; }
    if (!form.contactPerson.trim()) { wx.showToast({ title: '请输入联系人', icon: 'none' }); return; }
    if (!form.contactPhone.trim()) { wx.showToast({ title: '请输入联系方式', icon: 'none' }); return; }
    if (!form.responsiblePerson.trim()) { wx.showToast({ title: '请输入负责人', icon: 'none' }); return; }
    if (!form.expectedReturnDate.trim()) { wx.showToast({ title: '请选择预计归还日期', icon: 'none' }); return; }
    if (selectedMaterials.length === 0) { wx.showToast({ title: '请至少选择一种物资', icon: 'none' }); return; }

    for (const item of selectedMaterials) {
      if (item.quantity <= 0 || item.quantity > item.maxQuantity) {
        wx.showToast({ title: `${item.materialName} 数量应在 1~${item.maxQuantity}`, icon: 'none' });
        return;
      }
    }

    this.setData({ saving: true });
    const user = getCurrentUser();
    const now = formatTime();
    const assistantName = (user && user.name) || '未知';

    // 1. 创建活动
    const activity = ActivityService.create({
      id: generateId(),
      activityName: form.activityName.trim(),
      holdDate: form.holdDate.trim(),
      organizer: form.organizer.trim(),
      borrower: form.borrower.trim(),
      note: form.note.trim(),
      contactPerson: form.contactPerson.trim(),
      contactPhone: form.contactPhone.trim(),
      responsiblePerson: form.responsiblePerson.trim(),
      assistantName,
      borrowTime: now,
      expectedReturnTime: form.expectedReturnDate.trim(),
      status: 'active',
      extraNote: form.extraNote.trim(),
      handler: '',
      createdAt: now,
    });

    // 2. 创建物资明细
    const allChanged: { material: import('../../models/index').Material; quantity: number }[] = [];

    for (const item of selectedMaterials) {
      const material = MaterialService.findById(item.materialId);
      if (!material) continue;

      ActivityItemService.create({
        id: generateId(),
        activityId: activity.id,
        materialId: item.materialId,
        materialName: item.materialName,
        quantity: item.quantity,
        returnedQuantity: 0,
        unit: item.unit,
      });

      MaterialService.update(material.id, {
        currentStock: material.currentStock - item.quantity,
        updatedAt: now,
      });

      allChanged.push({ material, quantity: item.quantity });
    }

    // 3. 日志
    const summary = selectedMaterials.map(m => `${m.materialName}×${m.quantity}${m.unit}`).join('、');
    logActivityBorrow(activity, summary, allChanged);

    wx.showToast({ title: '借出成功', icon: 'success' });
    this.setData({ saving: false });
    setTimeout(() => wx.navigateBack(), 300);
  },
});
