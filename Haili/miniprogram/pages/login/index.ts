// pages/login/index.ts
import { login } from '../../services/auth.service';

Page({
  data: {
    username: '',
    password: '',
    loading: false,
  },

  /** 用户名输入 */
  onUsernameInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ username: e.detail.value });
  },

  /** 密码输入 */
  onPasswordInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ password: e.detail.value });
  },

  /** 登录 */
  onLogin() {
    const { username, password } = this.data;
    if (!username.trim() || !password.trim()) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    // 模拟网络延迟
    setTimeout(() => {
      const result = login(username, password);
      this.setData({ loading: false });

      if (result.success) {
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.redirectTo({ url: '/pages/dashboard/index' });
      } else {
        wx.showToast({ title: result.message, icon: 'none' });
      }
    }, 300);
  },
});
