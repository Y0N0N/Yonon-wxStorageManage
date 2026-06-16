// ============================================================
// Haili 物资管理小程序 — 操作日志服务
// ============================================================

import type { OperationLog, OperationType, Material, Activity } from '../models/index';
import { LogService, generateId, formatTime } from './storage.service';
import { getCurrentUser } from './auth.service';

function getOperatorName(): string {
  const user = getCurrentUser();
  return (user && user.name) || '未知';
}

/**
 * 记录一条操作日志
 */
export function recordLog(params: {
  operationType: OperationType;
  activityId?: string;
  activityName?: string;
  materialId: string;
  materialName: string;
  quantityChange?: number;
  relatedPerson?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  detail: string;
}): OperationLog {
  const log: OperationLog = {
    id: generateId(),
    operatorName: getOperatorName(),
    timestamp: formatTime(),
    ...params,
  };
  return LogService.create(log);
}

/**
 * 记录因活动借出（一条日志记录整个活动的物资概要）
 */
export function logActivityBorrow(
  activity: Activity,
  materialsSummary: string,
  allChanged: { material: Material; quantity: number }[],
): OperationLog {
  return recordLog({
    operationType: 'activity_borrow',
    activityId: activity.id,
    activityName: activity.activityName,
    materialId: 'multi',
    materialName: materialsSummary,
    quantityChange: -allChanged.reduce((s, c) => s + c.quantity, 0),
    relatedPerson: `${activity.borrower} / ${activity.responsiblePerson}`,
    detail: `因活动「${activity.activityName}」借出 ${materialsSummary}，借用人：${activity.borrower}，负责人：${activity.responsiblePerson}`,
  });
}

/**
 * 记录因活动归还（一条日志记录整个活动）
 */
export function logActivityReturn(
  activity: Activity,
  returnedSummary: string,
  receiver: string,
): OperationLog {
  return recordLog({
    operationType: 'activity_return',
    activityId: activity.id,
    activityName: activity.activityName,
    materialId: 'multi',
    materialName: returnedSummary,
    relatedPerson: receiver,
    detail: `因活动「${activity.activityName}」归还 ${returnedSummary}，接收人：${receiver}`,
  });
}

/**
 * 记录物资变动（新增/修改/删除）
 */
export function logMaterialChange(
  material: Material,
  changeType: 'create' | 'update' | 'delete',
  beforeSnapshot?: Record<string, unknown>,
): OperationLog {
  const typeMap: Record<string, OperationType> = {
    create: 'material_change',
    update: 'material_change',
    delete: 'material_change',
  };

  let detail = '';
  if (changeType === 'create') {
    detail = `新增物资：${material.name}，数量：${material.totalQuantity}${material.unit}，类别：${material.category}`;
  } else if (changeType === 'update') {
    detail = `修改物资：${material.name}`;
  } else {
    detail = `删除物资：${material.name}`;
  }

  return recordLog({
    operationType: 'material_change',
    materialId: material.id,
    materialName: material.name,
    quantityChange: changeType === 'delete' ? -(material.totalQuantity) : undefined,
    beforeSnapshot,
    afterSnapshot: changeType !== 'delete' ? material as unknown as Record<string, unknown> : undefined,
    detail,
  });
}
