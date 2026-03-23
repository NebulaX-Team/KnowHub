import { api } from './http'

export interface SiteInfo {
  title: string
  description: string
  titleI18n: {
    'zh-CN': string
    'en-US': string
  }
  descriptionI18n: {
    'zh-CN': string
    'en-US': string
  }
  siteTimezone: string
  updatedAt: string
}

export interface SiteInfoResponse {
  code: number
  data: SiteInfo
}

export interface UpdateSiteInfoDto {
  title?: string
  description?: string
  titleI18n?: {
    'zh-CN'?: string
    'en-US'?: string
  }
  descriptionI18n?: {
    'zh-CN'?: string
    'en-US'?: string
  }
  siteTimezone?: string
}

export interface SmtpConfig {
  host?: string
  port?: number
  user?: string
  pass?: string
  from?: string
  secure?: boolean
  registerSubject?: string
  registerTemplate?: string
  resetPasswordSubject?: string
  resetPasswordTemplate?: string
}

export interface AccessConfig {
  allowRegistration: boolean
  allowPasswordReset: boolean
}

export interface SetupStatus {
  needsSetup: boolean
  userCount: number
}

export interface InitializeSystemRequest {
  siteTitle?: string
  siteDescription?: string
  siteTitleI18n?: {
    'zh-CN'?: string
    'en-US'?: string
  }
  siteDescriptionI18n?: {
    'zh-CN'?: string
    'en-US'?: string
  }
  siteTimezone?: string
  adminEmail: string
  adminPassword: string
  adminDisplayName?: string
}

export interface InitializeSystemResponse {
  initialized: boolean
  userId: string
  email: string
}

export const systemApi = {
  // 获取网站信息
  async getSiteInfo(): Promise<SiteInfoResponse> {
    return api.get<SiteInfoResponse>('/system/site-info')
  },

  // 更新网站信息
  async updateSiteInfo(data: UpdateSiteInfoDto): Promise<SiteInfoResponse> {
    return api.put<SiteInfoResponse>('/system/site-info', data)
  },

  // Get SMTP config
  async getSmtpConfig(): Promise<{ code: number; data: SmtpConfig }> {
    return api.get('/system/smtp-config')
  },

  // Update SMTP config
  async updateSmtpConfig(data: SmtpConfig): Promise<{ code: number; data: SmtpConfig }> {
    return api.put('/system/smtp-config', data)
  },

  // Test SMTP connection
  async testSmtpConnection(data: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    secure: boolean;
    testEmail?: string;
  }): Promise<{ code: number; data: { success: boolean; message: string } }> {
    return api.post('/system/smtp-test', data)
  },

  // Get public access config
  async getAccessConfig(): Promise<{ code: number; data: AccessConfig }> {
    return api.get('/system/access-config')
  },

  // Update access config (admin)
  async updateAccessConfig(data: Partial<AccessConfig>): Promise<{ code: number; data: AccessConfig }> {
    return api.put('/system/access-config', data)
  },

  // Get setup status (public)
  async getSetupStatus(): Promise<{ code: number; data: SetupStatus }> {
    return api.get('/system/setup-status')
  },

  // Initialize system (public, first-run only)
  async initializeSystem(data: InitializeSystemRequest): Promise<{ code: number; data: InitializeSystemResponse }> {
    return api.post('/system/setup', data)
  },
}
