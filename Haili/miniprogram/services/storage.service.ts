// ============================================================
// Haili 物资管理小程序 — 本地存储服务
// ============================================================

import type {
  User, Material, OperationLog, Activity, ActivityItem,
  OperationType, UserRole, ActivityStatus
} from '../models/index';

// ============================================================
// 存储键名
// ============================================================
export const STORAGE_KEYS = {
  USERS: 'haili_users',
  MATERIALS: 'haili_materials',
  ACTIVITIES: 'haili_activities',
  ACTIVITY_ITEMS: 'haili_activity_items',
  OPERATION_LOGS: 'haili_operation_logs',
  CURRENT_USER: 'haili_current_user',
  INITIALIZED: 'haili_initialized',
} as const;

// ============================================================
// 工具函数
// ============================================================

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** 格式化时间为 yyyy-MM-dd HH:mm:ss */
export function formatTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 格式化日期为 yyyy-MM-dd */
export function formatDate(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * iOS 安全的日期解析
 * iOS 不支持 "YYYY-MM-DD HH:mm:ss" 格式
 */
export function parseDate(dateStr: string): Date {
  if (typeof dateStr === 'string' && dateStr.includes(' ')) {
    return new Date(dateStr.replace(' ', 'T'));
  }
  return new Date(dateStr);
}

/** 获取中文星期几 */
export function getWeekDay(dateStr: string): string {
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = parseDate(dateStr);
  return WEEKDAYS[d.getDay()];
}

// ============================================================
// 泛型 CRUD
// ============================================================

function getCollection<T>(key: string): T[] {
  try {
    return wx.getStorageSync(key) || [];
  } catch {
    return [];
  }
}

function setCollection<T>(key: string, data: T[]): void {
  wx.setStorageSync(key, data);
}

function findById<T extends { id: string }>(key: string, id: string): T | undefined {
  return getCollection<T>(key).find(item => item.id === id);
}

function create<T extends { id: string }>(key: string, item: T): T {
  const list = getCollection<T>(key);
  list.push(item);
  setCollection(key, list);
  return item;
}

function update<T extends { id: string }>(key: string, id: string, changes: Partial<T>): T | null {
  const list = getCollection<T>(key);
  const index = list.findIndex(item => item.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...changes };
  setCollection(key, list);
  return list[index];
}

function remove<T extends { id: string }>(key: string, id: string): boolean {
  const list = getCollection<T>(key);
  const index = list.findIndex(item => item.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  setCollection(key, list);
  return true;
}

// ============================================================
// 用户服务
// ============================================================
export const UserService = {
  findAll: () => getCollection<User>(STORAGE_KEYS.USERS),
  findById: (id: string) => findById<User>(STORAGE_KEYS.USERS, id),
  findByUsername: (username: string) => getCollection<User>(STORAGE_KEYS.USERS).find(u => u.username === username),
  create: (user: User) => create<User>(STORAGE_KEYS.USERS, user),
  update: (id: string, changes: Partial<User>) => update<User>(STORAGE_KEYS.USERS, id, changes),
  remove: (id: string) => remove<User>(STORAGE_KEYS.USERS, id),
  findAssistants: () => getCollection<User>(STORAGE_KEYS.USERS).filter(u => u.role === 'assistant' && u.isActive),
};

// ============================================================
// 物资服务
// ============================================================
export const MaterialService = {
  findAll: () => getCollection<Material>(STORAGE_KEYS.MATERIALS),
  findById: (id: string) => findById<Material>(STORAGE_KEYS.MATERIALS, id),
  create: (material: Material) => create<Material>(STORAGE_KEYS.MATERIALS, material),
  update: (id: string, changes: Partial<Material>) => update<Material>(STORAGE_KEYS.MATERIALS, id, changes),
  remove: (id: string) => remove<Material>(STORAGE_KEYS.MATERIALS, id),

  getTotalStock(): number {
    return this.findAll().reduce((sum, m) => sum + m.currentStock, 0);
  },

  getTotalBorrowed(): number {
    return this.findAll().reduce((sum, m) => sum + (m.totalQuantity - m.currentStock), 0);
  },

  getCategoryStats(): { category: string; count: number; stock: number }[] {
    const materials = this.findAll();
    const map = new Map<string, { count: number; stock: number }>();
    materials.forEach(m => {
      const existing = map.get(m.category) || { count: 0, stock: 0 };
      existing.count += m.totalQuantity;
      existing.stock += m.currentStock;
      map.set(m.category, existing);
    });
    return Array.from(map.entries()).map(([category, stats]) => ({ category, ...stats }));
  },
};

// ============================================================
// 活动服务（Activity）
// ============================================================
export const ActivityService = {
  findAll: () => getCollection<Activity>(STORAGE_KEYS.ACTIVITIES),
  findById: (id: string) => findById<Activity>(STORAGE_KEYS.ACTIVITIES, id),
  create: (activity: Activity) => create<Activity>(STORAGE_KEYS.ACTIVITIES, activity),
  update: (id: string, changes: Partial<Activity>) => update<Activity>(STORAGE_KEYS.ACTIVITIES, id, changes),

  /** 获取进行中的活动 */
  findActive(): Activity[] {
    return getCollection<Activity>(STORAGE_KEYS.ACTIVITIES)
      .filter(a => a.status === 'active' || a.status === 'partial')
      .sort((a, b) => parseDate(b.borrowTime).getTime() - parseDate(a.borrowTime).getTime());
  },

  /** 获取逾期活动 */
  findOverdue(): Activity[] {
    const now = Date.now();
    return getCollection<Activity>(STORAGE_KEYS.ACTIVITIES)
      .filter(a => (a.status === 'active' || a.status === 'partial')
        && parseDate(a.expectedReturnTime).getTime() < now)
      .sort((a, b) => parseDate(a.expectedReturnTime).getTime() - parseDate(b.expectedReturnTime).getTime());
  },

  countOverdue(): number {
    return this.findOverdue().length;
  },

  /** 获取借出中活动的物资总数（所有活动的所有物资借出量之和） */
  getTotalBorrowedQuantity(): number {
    const items = ActivityItemService.findByStatus('active', 'partial');
    return items.reduce((sum, item) => sum + (item.quantity - item.returnedQuantity), 0);
  },
};

// ============================================================
// 活动物资明细服务（ActivityItem）
// ============================================================
export const ActivityItemService = {
  findAll: () => getCollection<ActivityItem>(STORAGE_KEYS.ACTIVITY_ITEMS),
  findById: (id: string) => findById<ActivityItem>(STORAGE_KEYS.ACTIVITY_ITEMS, id),
  create: (item: ActivityItem) => create<ActivityItem>(STORAGE_KEYS.ACTIVITY_ITEMS, item),
  update: (id: string, changes: Partial<ActivityItem>) => update<ActivityItem>(STORAGE_KEYS.ACTIVITY_ITEMS, id, changes),

  /** 按活动查询 */
  findByActivity(activityId: string): ActivityItem[] {
    return getCollection<ActivityItem>(STORAGE_KEYS.ACTIVITY_ITEMS)
      .filter(item => item.activityId === activityId);
  },

  /** 按状态查询（通过关联活动判断） */
  findByStatus(...statuses: ActivityStatus[]): ActivityItem[] {
    const activities = getCollection<Activity>(STORAGE_KEYS.ACTIVITIES)
      .filter(a => statuses.includes(a.status));
    const activityIds = new Set(activities.map(a => a.id));
    return getCollection<ActivityItem>(STORAGE_KEYS.ACTIVITY_ITEMS)
      .filter(item => activityIds.has(item.activityId));
  },
};

// ============================================================
// 操作日志服务
// ============================================================
export const LogService = {
  findAll: () => getCollection<OperationLog>(STORAGE_KEYS.OPERATION_LOGS),
  create: (log: OperationLog) => create<OperationLog>(STORAGE_KEYS.OPERATION_LOGS, log),

  getRecent(limit: number = 10): OperationLog[] {
    return getCollection<OperationLog>(STORAGE_KEYS.OPERATION_LOGS)
      .sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime())
      .slice(0, limit);
  },

  findByType(type: OperationType): OperationLog[] {
    return getCollection<OperationLog>(STORAGE_KEYS.OPERATION_LOGS)
      .filter(l => l.operationType === type)
      .sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
  },
};

// ============================================================
// 初始化默认数据（版本控制）
// ============================================================
const SEED_VERSION = 'v4';

export function seedDefaultData(): void {
  const storedVersion = wx.getStorageSync(STORAGE_KEYS.INITIALIZED) as string;
  if (storedVersion === SEED_VERSION) return;

  const now = new Date();
  const d = (daysOffset: number) => formatTime(new Date(now.getTime() - daysOffset * 86400000));
  const dd = (daysOffset: number) => formatDate(new Date(now.getTime() - daysOffset * 86400000));

  // ---- 用户 ----
  const defaultUsers: User[] = [
    { id: 'admin_001', username: 'admin', password: 'admin123', name: '管理员', role: 'admin', phone: '', createdAt: formatTime(new Date('2025-01-01')), isActive: true },
    { id: 'stu_001', username: 'zhang', password: '123456', name: '张助理', role: 'assistant', phone: '13800138001', createdAt: formatTime(new Date('2025-02-15')), isActive: true },
    { id: 'stu_002', username: 'li', password: '123456', name: '李助理', role: 'assistant', phone: '13800138002', createdAt: formatTime(new Date('2025-03-01')), isActive: true },
    { id: 'stu_003', username: 'wang', password: '123456', name: '王助理', role: 'assistant', phone: '13800138003', createdAt: formatTime(new Date('2025-03-20')), isActive: true },
  ];

  // ---- 物资 ----
  const defaultMaterials: Material[] = [
    { id: 'mat_001', name: '帐篷', category: '户外设备', spec: '3m×3m 军用款', totalQuantity: 20, currentStock: 17, unit: '顶', createdAt: d(0), updatedAt: d(0) },
    { id: 'mat_002', name: '折叠桌', category: '桌椅', spec: '1.2m×0.6m 白色', totalQuantity: 30, currentStock: 24, unit: '张', createdAt: d(0), updatedAt: d(0) },
    { id: 'mat_003', name: '胶凳', category: '桌椅', spec: '红色 加厚', totalQuantity: 100, currentStock: 90, unit: '张', createdAt: d(0), updatedAt: d(0) },
    { id: 'mat_004', name: '遮阳伞', category: '户外设备', spec: '2.5m 沙滩伞', totalQuantity: 15, currentStock: 15, unit: '把', createdAt: d(0), updatedAt: d(0) },
    { id: 'mat_005', name: '扩音器', category: '电子设备', spec: '便携式 蓝牙', totalQuantity: 10, currentStock: 8, unit: '个', createdAt: d(0), updatedAt: d(0) },
    { id: 'mat_006', name: '警戒带', category: '户外设备', spec: '红白 50m/卷', totalQuantity: 40, currentStock: 38, unit: '卷', createdAt: d(0), updatedAt: d(0) },
    { id: 'mat_007', name: '矿泉水', category: '消耗品', spec: '550ml×24瓶/箱', totalQuantity: 50, currentStock: 42, unit: '箱', createdAt: d(0), updatedAt: d(0) },
  ];

  // ---- 活动 ----
  const defaultActivities: Activity[] = [
    { id: 'act_001', activityName: '校运会', holdDate: dd(7), organizer: '体育学院', borrower: '体育部', contactPerson: '小张', contactPhone: '13800001111', responsiblePerson: '陈老师', assistantName: '张助理', borrowTime: d(7), expectedReturnTime: dd(1), status: 'active', note: '校运会备用物资', extraNote: '', handler: '', createdAt: d(7) },
    { id: 'act_002', activityName: '学生会团建', holdDate: dd(5), organizer: '校团委', borrower: '学生会', contactPerson: '小李', contactPhone: '13800002222', responsiblePerson: '刘老师', assistantName: '李助理', borrowTime: d(5), expectedReturnTime: dd(0), status: 'active', note: '户外团建活动', extraNote: '', handler: '', createdAt: d(5) },
    { id: 'act_003', activityName: '办公室会议', holdDate: dd(10), organizer: '校长办公室', borrower: '办公室', contactPerson: '小王', contactPhone: '13800003333', responsiblePerson: '陈老师', assistantName: '张助理', borrowTime: d(10), expectedReturnTime: dd(8), status: 'returned', note: '会议布置已归还', extraNote: '', handler: '', createdAt: d(10) },
  ];

  // ---- 活动物资明细 ----
  const defaultActivityItems: ActivityItem[] = [
    // 校运会
    { id: 'ai_001', activityId: 'act_001', materialId: 'mat_001', materialName: '帐篷', quantity: 3, returnedQuantity: 0, unit: '顶' },
    { id: 'ai_002', activityId: 'act_001', materialId: 'mat_003', materialName: '胶凳', quantity: 10, returnedQuantity: 0, unit: '张' },
    // 学生会团建
    { id: 'ai_003', activityId: 'act_002', materialId: 'mat_007', materialName: '矿泉水', quantity: 8, returnedQuantity: 0, unit: '箱' },
    { id: 'ai_004', activityId: 'act_002', materialId: 'mat_006', materialName: '警戒带', quantity: 2, returnedQuantity: 0, unit: '卷' },
    // 办公室会议（已归还）
    { id: 'ai_005', activityId: 'act_003', materialId: 'mat_002', materialName: '折叠桌', quantity: 6, returnedQuantity: 6, unit: '张' },
    { id: 'ai_006', activityId: 'act_003', materialId: 'mat_003', materialName: '胶凳', quantity: 10, returnedQuantity: 10, unit: '张' },
  ];

  // ---- 操作日志 ----
  const defaultLogs: OperationLog[] = [
    { id: 'log_001', operatorName: '张助理', operationType: 'activity_borrow', activityId: 'act_001', activityName: '校运会', materialId: 'mat_001', materialName: '帐篷', quantityChange: -3, relatedPerson: '体育部 / 陈老师', timestamp: d(7), detail: '因活动「校运会」借出 帐篷×3顶、胶凳×10张，借用人：体育部，负责人：陈老师' },
    { id: 'log_002', operatorName: '李助理', operationType: 'activity_borrow', activityId: 'act_002', activityName: '学生会团建', materialId: 'mat_007', materialName: '矿泉水', quantityChange: -8, relatedPerson: '学生会 / 刘老师', timestamp: d(5), detail: '因活动「学生会团建」借出 矿泉水×8箱、警戒带×2卷，借用人：学生会，负责人：刘老师' },
    { id: 'log_003', operatorName: '张助理', operationType: 'activity_return', activityId: 'act_003', activityName: '办公室会议', materialId: 'mat_002', materialName: '折叠桌', quantityChange: 6, relatedPerson: '张助理', timestamp: d(8), detail: '因活动「办公室会议」归还 折叠桌×6张、胶凳×10张，接收人：张助理' },
  ];

  // ---- 写入 ----
  setCollection(STORAGE_KEYS.USERS, defaultUsers);
  setCollection(STORAGE_KEYS.MATERIALS, defaultMaterials);
  setCollection(STORAGE_KEYS.ACTIVITIES, defaultActivities);
  setCollection(STORAGE_KEYS.ACTIVITY_ITEMS, defaultActivityItems);
  setCollection(STORAGE_KEYS.OPERATION_LOGS, defaultLogs);
  wx.setStorageSync(STORAGE_KEYS.INITIALIZED, SEED_VERSION);
}
