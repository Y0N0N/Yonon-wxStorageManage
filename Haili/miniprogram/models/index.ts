// ============================================================
// Haili 物资管理小程序 — 数据模型定义
// ============================================================

/** 用户角色 */
export type UserRole = 'admin' | 'assistant';

/** 借出记录状态 */
export type BorrowStatus = 'borrowed' | 'partial' | 'returned';

/** 活动状态 */
export type ActivityStatus = 'active' | 'partial' | 'returned' | 'special' | 'resolved';

/**
 * 操作类型
 * - activity_borrow: 因活动借出物资
 * - activity_return: 因活动归还物资
 * - material_change: 物资变动（采购/丢失报损等，在物资管理界面操作）
 */
export type OperationType = 'activity_borrow' | 'activity_return' | 'material_change';

// ============================================================
// 用户（User）
// ============================================================
export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  isActive: boolean;
}

// ============================================================
// 物资（Material）
// ============================================================
export interface Material {
  id: string;
  name: string;
  category: string;
  spec?: string;
  totalQuantity: number;
  currentStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 活动（Activity）— 一次借出/归还事件
// ============================================================
export interface Activity {
  id: string;
  activityName: string;           // 活动名称（如"校运会"）
  holdDate: string;               // 举办时间
  organizer: string;              // 主办单位
  borrower: string;               // 借用人 / 申请单位
  contactPerson: string;          // 联系人
  contactPhone: string;           // 联系方式
  responsiblePerson: string;      // 负责人
  assistantName: string;          // 学生助理（经手人）
  borrowTime: string;
  expectedReturnTime: string;
  actualReturnTime?: string;
  status: ActivityStatus;
  note: string;                   // 物资用途
  extraNote: string;              // 额外备注
  handler: string;                // 处理人（其他处理时）
  createdAt: string;
}

// ============================================================
// 活动物资明细（ActivityItem）— 一个活动中每种物资的借还数量
// ============================================================
export interface ActivityItem {
  id: string;
  activityId: string;
  materialId: string;
  materialName: string;
  quantity: number;               // 借出数量
  returnedQuantity: number;       // 已归还数量
  unit: string;
}

// ============================================================
// 操作日志（OperationLog）
// ============================================================
export interface OperationLog {
  id: string;
  operatorName: string;
  operationType: OperationType;
  activityId?: string;            // 关联的活动 ID
  activityName?: string;          // 活动名称
  materialId: string;
  materialName: string;
  quantityChange?: number;
  relatedPerson?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  timestamp: string;
  detail: string;
}

// ============================================================
// 看板统计数据
// ============================================================
export interface DashboardStats {
  totalMaterials: number;
  totalInStock: number;
  totalBorrowed: number;
  overdueCount: number;
  activeActivities: number;
  recentLogs: OperationLog[];
}
