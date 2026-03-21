import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '@/database/database.service';
import { LocalizedTextDto, UpdateSiteInfoDto } from './dto/update-site-info.dto';
import { SiteInfoResponseDto } from './dto/site-info-response.dto';
import { UpdateSmtpConfigDto, TestSmtpConfigDto } from './dto/smtp-config.dto';

type LocalizedText = {
  'zh-CN': string;
  'en-US': string;
};

const DEFAULT_SITE_TITLE: LocalizedText = {
  'zh-CN': '知枢',
  'en-US': 'KnowHub',
};

const DEFAULT_SITE_DESCRIPTION: LocalizedText = {
  'zh-CN': '面向个人的结构化知识管理系统',
  'en-US': 'Personal Knowledge Management System',
};

@Injectable()
export class SystemService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * 获取网站信息
   */
  async getSiteInfo(acceptLanguage?: string): Promise<SiteInfoResponseDto> {
    const titleResult = await this.database.queryOne(
      'SELECT value, updatedAt FROM SystemConfig WHERE key = ?',
      ['siteTitle']
    );

    const descriptionResult = await this.database.queryOne(
      'SELECT value, updatedAt FROM SystemConfig WHERE key = ?',
      ['siteDescription']
    );

    const titleI18n = this.parseLocalizedConfigValue(titleResult?.value, DEFAULT_SITE_TITLE);
    const descriptionI18n = this.parseLocalizedConfigValue(descriptionResult?.value, DEFAULT_SITE_DESCRIPTION);
    const locale = this.resolveSiteInfoLocale(acceptLanguage);
    const title = titleI18n[locale];
    const description = descriptionI18n[locale];
    const updatedAt = titleResult?.updatedAt || descriptionResult?.updatedAt || new Date().toISOString();

    return {
      title,
      description,
      titleI18n,
      descriptionI18n,
      updatedAt
    };
  }

  /**
   * 更新网站信息
   */
  async updateSiteInfo(updateSiteInfoDto: UpdateSiteInfoDto, acceptLanguage?: string): Promise<SiteInfoResponseDto> {
    const now = new Date().toISOString();

    const titleResult = await this.database.queryOne(
      'SELECT value FROM SystemConfig WHERE key = ?',
      ['siteTitle']
    );
    const descriptionResult = await this.database.queryOne(
      'SELECT value FROM SystemConfig WHERE key = ?',
      ['siteDescription']
    );

    const currentTitleI18n = this.parseLocalizedConfigValue(titleResult?.value, DEFAULT_SITE_TITLE);
    const currentDescriptionI18n = this.parseLocalizedConfigValue(descriptionResult?.value, DEFAULT_SITE_DESCRIPTION);

    const nextTitleI18n = this.mergeLocalizedText(
      currentTitleI18n,
      updateSiteInfoDto.titleI18n,
      updateSiteInfoDto.title
    );
    const nextDescriptionI18n = this.mergeLocalizedText(
      currentDescriptionI18n,
      updateSiteInfoDto.descriptionI18n,
      updateSiteInfoDto.description
    );

    if (updateSiteInfoDto.title !== undefined || updateSiteInfoDto.titleI18n !== undefined) {
      const existing = await this.database.queryOne(
        'SELECT key FROM SystemConfig WHERE key = ?',
        ['siteTitle']
      );

      if (existing) {
        await this.database.run(
          'UPDATE SystemConfig SET value = ?, updatedAt = ? WHERE key = ?',
          [JSON.stringify(nextTitleI18n), now, 'siteTitle']
        );
      } else {
        await this.database.run(
          'INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)',
          ['siteTitle', JSON.stringify(nextTitleI18n), now]
        );
      }
    }

    if (updateSiteInfoDto.description !== undefined || updateSiteInfoDto.descriptionI18n !== undefined) {
      const existing = await this.database.queryOne(
        'SELECT key FROM SystemConfig WHERE key = ?',
        ['siteDescription']
      );

      if (existing) {
        await this.database.run(
          'UPDATE SystemConfig SET value = ?, updatedAt = ? WHERE key = ?',
          [JSON.stringify(nextDescriptionI18n), now, 'siteDescription']
        );
      } else {
        await this.database.run(
          'INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)',
          ['siteDescription', JSON.stringify(nextDescriptionI18n), now]
        );
      }
    }

    return this.getSiteInfo(acceptLanguage);
  }

  private resolveSiteInfoLocale(acceptLanguage?: string): 'zh-CN' | 'en-US' {
    if (!acceptLanguage) return 'en-US';
    const normalized = acceptLanguage.toLowerCase();
    return normalized.startsWith('zh') || /\bzh([_-]cn)?\b/.test(normalized) ? 'zh-CN' : 'en-US';
  }

  private parseLocalizedConfigValue(rawValue: string | undefined, fallback: LocalizedText): LocalizedText {
    if (!rawValue) {
      return { ...fallback };
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const zh = typeof obj['zh-CN'] === 'string' ? obj['zh-CN'] : undefined;
        const en = typeof obj['en-US'] === 'string' ? obj['en-US'] : undefined;
        if (zh || en) {
          return {
            'zh-CN': (zh || fallback['zh-CN']).trim(),
            'en-US': (en || fallback['en-US']).trim(),
          };
        }
      }
    } catch {
      // Legacy plain-text value, keep backward compatibility.
    }

    const legacy = rawValue.trim();
    if (!legacy) {
      return { ...fallback };
    }

    return {
      'zh-CN': legacy,
      'en-US': legacy,
    };
  }

  private mergeLocalizedText(
    current: LocalizedText,
    partial?: LocalizedTextDto,
    legacy?: string,
  ): LocalizedText {
    const next: LocalizedText = { ...current };

    if (legacy !== undefined) {
      const value = legacy.trim();
      next['zh-CN'] = value;
      next['en-US'] = value;
    }

    if (!partial) {
      return next;
    }

    const zh = partial['zh-CN'];
    const en = partial['en-US'];

    if (zh !== undefined) {
      next['zh-CN'] = zh.trim();
    }
    if (en !== undefined) {
      next['en-US'] = en.trim();
    }

    return next;
  }

  /**
   * Get SMTP configuration
   */
  async getSmtpConfig(): Promise<UpdateSmtpConfigDto> {
    const result = await this.database.queryOne(
      'SELECT value FROM SystemConfig WHERE key = ?',
      ['smtpConfig']
    );

    if (result && result.value) {
      try {
        return JSON.parse(result.value);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  /**
   * Update SMTP configuration
   */
  async updateSmtpConfig(config: UpdateSmtpConfigDto): Promise<UpdateSmtpConfigDto> {
    const now = new Date().toISOString();
    const result = await this.database.queryOne(
      'SELECT value FROM SystemConfig WHERE key = ?',
      ['smtpConfig']
    );

    let currentConfig = {};
    if (result && result.value) {
      try {
        currentConfig = JSON.parse(result.value);
      } catch (e) {
        // ignore
      }
    }

    const newConfig = { ...currentConfig, ...config };
    const value = JSON.stringify(newConfig);

    if (result) {
      await this.database.run(
        'UPDATE SystemConfig SET value = ?, updatedAt = ? WHERE key = ?',
        [value, now, 'smtpConfig']
      );
    } else {
      await this.database.run(
        'INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)',
        ['smtpConfig', value, now]
      );
    }

    return newConfig;
  }

  /**
   * Test SMTP connection
   */
  async testSmtpConnection(config: TestSmtpConfigDto): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure, // true for 465, false for other ports
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      await transporter.verify();
      
      // If testEmail is provided, send a test email
      if (config.testEmail) {
        await transporter.sendMail({
          from: config.from,
          to: config.testEmail,
          subject: 'SMTP Test Email from KnowHub',
          html: '<p>This is a test email to verify your SMTP configuration.</p><p>If you received this email, your SMTP settings are working correctly!</p>',
        });
        return { success: true, message: 'Connection successful and test email sent' };
      }
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      throw new BadRequestException(`Connection failed: ${error.message}`);
    }
  }
}
