/**
 * ============================================================
 * Haili 物资管理助手 — 微信小程序
 * 作者：韦永昌（Yonon） | https://github.com/Y0N0N/Yonon-wxStorageManage
 * ============================================================
 */
// app.ts
import { seedDefaultData } from './services/storage.service';

App<IAppOption>({
  globalData: {
    isLoggedIn: false,
  },

  onLaunch() {
    // 初始化默认数据（首次运行）
    seedDefaultData();

    // 后续可在此处唤起云开发/后端连接
  },
});
