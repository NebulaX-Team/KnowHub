type AppLocale = 'en-US' | 'zh-CN';

interface TranslationPair {
  'en-US': string;
  'zh-CN': string;
}

const MESSAGE_DICTIONARY: Record<string, TranslationPair> = {
  'Internal server error': { 'en-US': 'Internal server error', 'zh-CN': '服务器内部错误' },
  'Unauthorized': { 'en-US': 'Unauthorized', 'zh-CN': '未授权' },
  'Forbidden resource': { 'en-US': 'Forbidden resource', 'zh-CN': '禁止访问该资源' },

  'Admin access required': { 'en-US': 'Admin access required', 'zh-CN': '需要管理员权限' },
  'Authentication required': { 'en-US': 'Authentication required', 'zh-CN': '需要登录认证' },
  'Cannot move page under its own descendant': { 'en-US': 'Cannot move page under its own descendant', 'zh-CN': '不能将页面移动到其子页面下' },
  'Cannot move page under itself': { 'en-US': 'Cannot move page under itself', 'zh-CN': '不能将页面移动到自身下' },
  'Circular reference detected': { 'en-US': 'Circular reference detected', 'zh-CN': '检测到循环引用' },
  'Current password is incorrect': { 'en-US': 'Current password is incorrect', 'zh-CN': '当前密码不正确' },
  'Email already exists': { 'en-US': 'Email already exists', 'zh-CN': '邮箱已存在' },
  'File is required': { 'en-US': 'File is required', 'zh-CN': '必须上传文件' },
  'Image not found or unauthorized': { 'en-US': 'Image not found or unauthorized', 'zh-CN': '图片不存在或无权限' },
  'Invalid credentials': { 'en-US': 'Invalid credentials', 'zh-CN': '账号或密码错误' },
  'Library not found': { 'en-US': 'Library not found', 'zh-CN': '知识库不存在' },
  'Library not found or not public': { 'en-US': 'Library not found or not public', 'zh-CN': '知识库不存在或未公开' },
  'New password must be different from the current password': { 'en-US': 'New password must be different from the current password', 'zh-CN': '新密码不能与当前密码相同' },
  'Page not found': { 'en-US': 'Page not found', 'zh-CN': '页面不存在' },
  'Page not found or not public': { 'en-US': 'Page not found or not public', 'zh-CN': '页面不存在或未公开' },
  'Parent page must belong to the same library': { 'en-US': 'Parent page must belong to the same library', 'zh-CN': '父页面必须属于同一个知识库' },
  'Parent page not found': { 'en-US': 'Parent page not found', 'zh-CN': '父页面不存在' },
  'Password is incorrect': { 'en-US': 'Password is incorrect', 'zh-CN': '密码不正确' },
  'Public slug already exists': { 'en-US': 'Public slug already exists', 'zh-CN': '公开链接标识已存在' },
  'Tag is already attached to this page': { 'en-US': 'Tag is already attached to this page', 'zh-CN': '该标签已绑定到此页面' },
  'Tag is not attached to this page': { 'en-US': 'Tag is not attached to this page', 'zh-CN': '该标签未绑定到此页面' },
  'Tag not found': { 'en-US': 'Tag not found', 'zh-CN': '标签不存在' },
  'Tag with this name already exists': { 'en-US': 'Tag with this name already exists', 'zh-CN': '同名标签已存在' },
  'Target library not found': { 'en-US': 'Target library not found', 'zh-CN': '目标知识库不存在' },
  'Target parent page not found': { 'en-US': 'Target parent page not found', 'zh-CN': '目标父页面不存在' },
  'Uploaded file not found': { 'en-US': 'Uploaded file not found', 'zh-CN': '未找到上传文件' },
  'User not found': { 'en-US': 'User not found', 'zh-CN': '用户不存在' },
  'User not found or profile is not public': { 'en-US': 'User not found or profile is not public', 'zh-CN': '用户不存在或资料未公开' },
  'User with this email already exists': { 'en-US': 'User with this email already exists', 'zh-CN': '该邮箱已被注册' },
  'Version not found': { 'en-US': 'Version not found', 'zh-CN': '版本不存在' },
  'Version retention limit must be non-negative': { 'en-US': 'Version retention limit must be non-negative', 'zh-CN': '版本保留数量不能为负数' },
  'You cannot ban yourself': { 'en-US': 'You cannot ban yourself', 'zh-CN': '不能封禁自己' },
  'You cannot delete yourself': { 'en-US': 'You cannot delete yourself', 'zh-CN': '不能删除自己' },
  'Your account has been banned': { 'en-US': 'Your account has been banned', 'zh-CN': '你的账号已被封禁' },

  '该邮箱已注册': { 'en-US': 'This email is already registered', 'zh-CN': '该邮箱已注册' },
  '该邮箱未注册': { 'en-US': 'This email is not registered', 'zh-CN': '该邮箱未注册' },
  '验证码已过期': { 'en-US': 'Verification code has expired', 'zh-CN': '验证码已过期' },
  '验证码已过期或未发送': { 'en-US': 'Verification code has expired or was not sent', 'zh-CN': '验证码已过期或未发送' },
  '验证码错误': { 'en-US': 'Invalid verification code', 'zh-CN': '验证码错误' },

  'Auto-saved': { 'en-US': 'Auto-saved', 'zh-CN': '自动保存' },
  'Connection successful': { 'en-US': 'Connection successful', 'zh-CN': '连接成功' },
  'Connection successful and test email sent': { 'en-US': 'Connection successful and test email sent', 'zh-CN': '连接成功并已发送测试邮件' },
  'Library deleted successfully': { 'en-US': 'Library deleted successfully', 'zh-CN': '知识库删除成功' },
  'Page deleted successfully': { 'en-US': 'Page deleted successfully', 'zh-CN': '页面删除成功' },
  'Page settings updated successfully': { 'en-US': 'Page settings updated successfully', 'zh-CN': '页面设置更新成功' },
  'Tag attached successfully': { 'en-US': 'Tag attached successfully', 'zh-CN': '标签绑定成功' },
  'Tag deleted successfully': { 'en-US': 'Tag deleted successfully', 'zh-CN': '标签删除成功' },
  'Tag detached successfully': { 'en-US': 'Tag detached successfully', 'zh-CN': '标签解绑成功' },
  'Tags updated successfully': { 'en-US': 'Tags updated successfully', 'zh-CN': '标签更新成功' },
  'Version deleted successfully': { 'en-US': 'Version deleted successfully', 'zh-CN': '版本删除成功' },
  '密码重置成功': { 'en-US': 'Password reset successful', 'zh-CN': '密码重置成功' },
  '验证码已发送': { 'en-US': 'Verification code sent', 'zh-CN': '验证码已发送' },
  '验证码已生成（开发模式）': { 'en-US': 'Verification code generated (development mode)', 'zh-CN': '验证码已生成（开发模式）' },
  '验证码验证成功': { 'en-US': 'Verification code verified', 'zh-CN': '验证码验证成功' },
};

const ZH_LOCALE_PREFIX = 'zh';

export function resolveLocale(acceptLanguage?: string | string[]): AppLocale {
  if (!acceptLanguage) return 'en-US';
  const raw = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  if (!raw) return 'en-US';
  const normalized = raw.toLowerCase();
  if (normalized.startsWith(ZH_LOCALE_PREFIX) || /\bzh([_-]cn)?\b/.test(normalized)) {
    return 'zh-CN';
  }
  return 'en-US';
}

function translateSingleMessage(message: string, locale: AppLocale): string {
  const pair = MESSAGE_DICTIONARY[message];
  if (!pair) return message;
  return pair[locale] || message;
}

export function translateKnownMessage(message: string | string[], locale: AppLocale): string | string[] {
  if (Array.isArray(message)) {
    return message.map((item) => (typeof item === 'string' ? translateSingleMessage(item, locale) : item));
  }
  return translateSingleMessage(message, locale);
}

export function translatePayloadMessages<T>(payload: T, locale: AppLocale): T {
  if (payload === null || payload === undefined) return payload;

  // Keep Date instances untouched so JSON serialization can preserve ISO strings.
  if (payload instanceof Date) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => translatePayloadMessages(item, locale)) as T;
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  const objectProto = Object.getPrototypeOf(payload);
  if (objectProto !== Object.prototype && objectProto !== null) {
    return payload;
  }

  const source = payload as Record<string, unknown>;
  const translated: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === 'message' && (typeof value === 'string' || Array.isArray(value))) {
      translated[key] = translateKnownMessage(value as string | string[], locale);
      continue;
    }
    translated[key] = translatePayloadMessages(value, locale);
  }

  return translated as T;
}
