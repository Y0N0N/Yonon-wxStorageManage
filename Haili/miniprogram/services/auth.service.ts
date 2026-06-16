// ============================================================
// Haili 物资管理小程序 — 认证与权限服务
// 作者：韦永昌（Yonon） | https://github.com/Y0N0N/Yonon-wxStorageManage
// ============================================================

import type { User, UserRole } from '../models/index';
import { UserService, STORAGE_KEYS } from './storage.service';

// ============================================================
// 会话管理
// ============================================================

/** 获取当前登录用户 */
export function getCurrentUser(): User | null {
  try {
    const data = wx.getStorageSync(STORAGE_KEYS.CURRENT_USER);
    return data || null;
  } catch {
    return null;
  }
}

/** 保存当前用户到会话 */
function saveSession(user: User): void {
  // 不保存密码到会话
  const { password, ...safeUser } = user;
  wx.setStorageSync(STORAGE_KEYS.CURRENT_USER, safeUser);
}

/** 清除会话 */
function clearSession(): void {
  wx.removeStorageSync(STORAGE_KEYS.CURRENT_USER);
}

// ============================================================
// 登录 / 注销
// ============================================================

export interface LoginResult {
  success: boolean;
  message: string;
  user?: User;
}

/**
 * 用户登录
 * 校验用户名密码，返回登录结果
 */
export function login(username: string, password: string): LoginResult {
  if (!username.trim() || !password.trim()) {
    return { success: false, message: '请输入账号和密码' };
  }

  const user = UserService.findByUsername(username.trim());
  if (!user) {
    return { success: false, message: '账号不存在' };
  }

  if (!user.isActive) {
    return { success: false, message: '该账号已被禁用' };
  }

  if (user.password !== password.trim()) {
    return { success: false, message: '密码错误' };
  }

  saveSession(user);
  return { success: true, message: '登录成功', user };
}

/**
 * 注销登录
 */
export function logout(): void {
  clearSession();
}

/**
 * 是否已登录
 */
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

// ============================================================
// 权限校验
// ============================================================

/**
 * 检查当前用户是否拥有指定角色
 */
export function hasRole(role: UserRole): boolean {
  const user = getCurrentUser();
  return user !== null && user.role === role;
}

/**
 * 检查当前用户是否为管理员
 */
export function isAdmin(): boolean {
  return hasRole('admin');
}

/**
 * 检查当前用户是否为学生助理
 */
export function isAssistant(): boolean {
  return hasRole('assistant');
}

/**
 * 权限守卫：重定向到登录页
 * 在需要登录的页面 onShow 中调用
 */
export function requireAuth(): boolean {
  if (!isLoggedIn()) {
    wx.redirectTo({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

/**
 * 权限守卫：仅管理员可访问
 */
export function requireAdmin(): boolean {
  if (!requireAuth()) return false;
  if (!isAdmin()) {
    wx.showToast({ title: '无权限访问', icon: 'none' });
    wx.navigateBack();
    return false;
  }
  return true;
}
