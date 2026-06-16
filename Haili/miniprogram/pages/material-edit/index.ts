// pages/material-edit/index.ts
import { requireAuth, isAssistant, getCurrentUser } from '../../services/auth.service';
import { MaterialService, generateId, formatTime } from '../../services/storage.service';
import { logMaterialChange } from '../../services/log.service';

const CATEGORIES = ['户外设备', '桌椅', '电子设备', '消耗品', '其他'];

Page({
  data: {
    isEdit: false,
    materialId: '',
    form: {
      name: '',
      category: '其他',
      spec: '',
      totalQuantity: 0,
      unit: '个',
    },
    categories: CATEGORIES,
    showCategoryPicker: false,
    saving: false,
  },

  onLoad(options: WechatMiniprogram.PageOption) {
    if (!requireAuth()) return;
    if (!isAssistant()) {
      wx.showToast({ title: '无编辑权限', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const id = options.id as string;
    if (id) {
      const material = MaterialService.findById(id);
      if (material) {
        this.setData({
          isEdit: true,
          materialId: id,
          form: {
            name: material.name,
            category: material.category,
            spec: material.spec || '',
            totalQuantity: material.totalQuantity,
            unit: material.unit,
          },
        });
      }
    }
  },

  /** 返回上一页 */
  goBack() {
    wx.navigateBack();
  },

  /** 表单输入 */
  onNameInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'form.name': e.detail.value });
  },
  onSpecInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'form.spec': e.detail.value });
  },
  onQuantityInput(e: WechatMiniprogram.InputEvent) {
    const val = parseInt(e.detail.value, 10);
    this.setData({ 'form.totalQuantity': isNaN(val) ? 0 : val });
  },
  onUnitInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'form.unit': e.detail.value });
  },

  /** 选择类别 */
  selectCategory(e: WechatMiniprogram.TouchEvent) {
    const cat = e.currentTarget.dataset.category as string;
    this.setData({
      'form.category': cat,
      showCategoryPicker: false,
    });
  },

  toggleCategoryPicker() {
    this.setData({
      showCategoryPicker: !this.data.showCategoryPicker,
    });
  },

  /** 保存 */
  onSave() {
    const { form, isEdit, materialId } = this.data;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入物资名称', icon: 'none' });
      return;
    }
    if (form.totalQuantity <= 0) {
      wx.showToast({ title: '数量必须大于 0', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    const now = formatTime();

    if (isEdit) {
      const original = MaterialService.findById(materialId);
      if (!original) {
        wx.showToast({ title: '物资不存在', icon: 'none' });
        this.setData({ saving: false });
        return;
      }

      // 计算在库变化
      const quantityDiff = form.totalQuantity - original.totalQuantity;
      const beforeSnapshot = { ...original };

      const updated = MaterialService.update(materialId, {
        name: form.name.trim(),
        category: form.category,
        spec: form.spec.trim(),
        totalQuantity: form.totalQuantity,
        unit: form.unit,
        currentStock: original.currentStock + quantityDiff,
        updatedAt: now,
      });

      if (updated) {
        logMaterialChange(updated, 'update', beforeSnapshot);
        wx.showToast({ title: '修改成功', icon: 'success' });
      }
    } else {
      const newMaterial = MaterialService.create({
        id: generateId(),
        name: form.name.trim(),
        category: form.category,
        spec: form.spec.trim(),
        totalQuantity: form.totalQuantity,
        currentStock: form.totalQuantity,
        unit: form.unit,
        createdAt: now,
        updatedAt: now,
      });
      logMaterialChange(newMaterial, 'create');
      wx.showToast({ title: '新增成功', icon: 'success' });
    }

    this.setData({ saving: false });
    setTimeout(() => wx.navigateBack(), 300);
  },

  /** 删除物资 */
  onDelete() {
    const { materialId } = this.data;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该物资吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          const material = MaterialService.findById(materialId);
          if (material) {
            logMaterialChange(material, 'delete');
            MaterialService.remove(materialId);
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 300);
          }
        }
      },
    });
  },
});
