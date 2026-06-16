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
