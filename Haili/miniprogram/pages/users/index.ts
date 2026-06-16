/**
 * Haili 物资管理助手
 * 作者：韦永昌（Yonon） | https://github.com/Y0N0N/Yonon-wxStorageManage
 */
// pages/users/index.ts
import { requireAdmin, getCurrentUser } from '../../services/auth.service';
import { UserService, generateId, formatTime } from '../../services/storage.service';

Page({
  data: {
    users: [] as WechatMiniprogram.IAnyObject[],
    currentUserId: '',
    // 弹窗
    showModal: false,
    modalTitle: '',
    form: {
      id: '',
      username: '',
      password: '',
      name: '',
      phone: '',
    },
    saving: false,
  },

  onShow() {
    if (!requireAdmin()) return;
    const user = getCurrentUser();
    this.setData({ currentUserId: (user && user.id) || '' });
    this.loadUsers();
  },

  loadUsers() {
    const users = UserService.findAll().map(u => ({
      ...u,
      isSelf: u.id === this.data.currentUserId,
      roleLabel: u.role === 'admin' ? '管理员' : '学生助理',
      statusLabel: u.isActive ? '可用' : '禁用',
      statusClass: u.isActive ? 'active' : 'disabled',
    }));
    this.setData({ users });
  },

  /** 返回上一页 */
  goBack() {
    wx.navigateBack();
  },

  /** 打开新增弹窗 */
  onAdd() {
    this.setData({
      showModal: true,
      modalTitle: '新增学生助理',
      form: { id: '', username: '', password: '', name: '', phone: '' },
    });
  },

  /** 打开编辑弹窗 */
  onEdit(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const user = UserService.findById(id);
    if (!user) return;

    this.setData({
      showModal: true,
      modalTitle: '编辑账号',
      form: {
        id: user.id,
        username: user.username,
        password: '',
        name: user.name,
        phone: user.phone || '',
      },
    });
  },

  /** 关闭弹窗 */
  closeModal() {
    this.setData({ showModal: false });
  },

  /** 表单输入 */
  onFieldInput(e: WechatMiniprogram.InputEvent) {
    const field = e.currentTarget.dataset.field as string;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  /** 保存用户 */
  onSave() {
    const { form } = this.data;

    if (!form.username.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' }); return;
    }
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' }); return;
    }

    // 新增时必须填密码
    if (!form.id && !form.password.trim()) {
      wx.showToast({ title: '请输入密码', icon: 'none' }); return;
    }

    this.setData({ saving: true });

    if (form.id) {
      // 编辑
      const changes: Record<string, string> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
      };
      if (form.password.trim()) {
        changes.password = form.password.trim();
      }
      UserService.update(form.id, changes);
      wx.showToast({ title: '修改成功', icon: 'success' });
    } else {
      // 新增
      const existing = UserService.findByUsername(form.username.trim());
      if (existing) {
        wx.showToast({ title: '账号已存在', icon: 'none' });
        this.setData({ saving: false });
        return;
      }

      UserService.create({
        id: generateId(),
        username: form.username.trim(),
        password: form.password.trim(),
        name: form.name.trim(),
        role: 'assistant',
        phone: form.phone.trim(),
        createdAt: formatTime(),
        isActive: true,
      });
      wx.showToast({ title: '新增成功', icon: 'success' });
    }

    this.setData({ saving: false, showModal: false });
    this.loadUsers();
  },

  /** 删除用户 */
  onDelete(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const user = UserService.findById(id);
    if (!user) return;

    if (user.role === 'admin') {
      wx.showToast({ title: '不能删除管理员账号', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除学生助理「${user.name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          UserService.remove(id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadUsers();
        }
      },
    });
  },

  /** 切换启用/禁用 */
  onToggleActive(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const user = UserService.findById(id);
    if (!user || user.role === 'admin') return;

    UserService.update(id, { isActive: !user.isActive });
    this.loadUsers();
  },
});
