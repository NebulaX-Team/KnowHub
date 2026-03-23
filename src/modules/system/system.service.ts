import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '@/database/database.service';
import { UserService } from '@/modules/user/user.service';
import { LocalizedTextDto, UpdateSiteInfoDto } from './dto/update-site-info.dto';
import { SiteInfoResponseDto } from './dto/site-info-response.dto';
import { UpdateSmtpConfigDto, TestSmtpConfigDto } from './dto/smtp-config.dto';
import { AccessConfigResponseDto, UpdateAccessConfigDto } from './dto/access-config.dto';
import {
  InitializeSystemDto,
  InitializeSystemResponseDto,
  SetupStatusResponseDto,
} from './dto/setup.dto';

type LocalizedText = {
  'zh-CN': string;
  'en-US': string;
};

const DEFAULT_SITE_TITLE: LocalizedText = {
  'zh-CN': '知枢 - KnowHub',
  'en-US': 'KnowHub',
};

const DEFAULT_SITE_DESCRIPTION: LocalizedText = {
  'zh-CN': '一个面向团队与组织的结构化知识协作系统。',
  'en-US': 'A collaborative knowledge hub designed for individuals, teams, and organizations.',
};
const DEFAULT_SITE_TIMEZONE = 'UTC+8';
const UTC_OFFSET_REGEX = /^UTC\s*([+-])\s*(\d{1,2})(?::?\s*(\d{2}))?$/i;

const DEFAULT_ACCESS_CONFIG: AccessConfigResponseDto = {
  allowRegistration: true,
  allowPasswordReset: true,
};

@Injectable()
export class SystemService {
  constructor(
    private readonly database: DatabaseService,
    private readonly userService: UserService,
  ) {}

  async getSetupStatus(): Promise<SetupStatusResponseDto> {
    const result = await this.database.queryOne('SELECT COUNT(*) as count FROM User');
    const userCount = Number(result?.count || 0);

    return {
      needsSetup: userCount === 0,
      userCount,
    };
  }

  async initializeSystem(dto: InitializeSystemDto): Promise<InitializeSystemResponseDto> {
    const setupStatus = await this.getSetupStatus();
    if (!setupStatus.needsSetup) {
      throw new BadRequestException('System has already been initialized');
    }

    const siteTitleI18n = this.resolveSetupLocalizedText(
      dto.siteTitleI18n,
      dto.siteTitle,
      DEFAULT_SITE_TITLE,
    );
    const siteDescriptionI18n = this.resolveSetupLocalizedText(
      dto.siteDescriptionI18n,
      dto.siteDescription,
      DEFAULT_SITE_DESCRIPTION,
    );
    const siteTimezone = dto.siteTimezone?.trim();
    const adminEmail = dto.adminEmail.trim().toLowerCase();
    const adminDisplayName = dto.adminDisplayName?.trim();

    const createdUser = await this.database.transaction(async () => {
      const result = await this.database.queryOne('SELECT COUNT(*) as count FROM User');
      const userCount = Number(result?.count || 0);
      if (userCount > 0) {
        throw new BadRequestException('System has already been initialized');
      }

      const user = await this.userService.create({
        email: adminEmail,
        password: dto.adminPassword,
        displayName: adminDisplayName || undefined,
      });

      await this.updateSiteInfo({
        titleI18n: siteTitleI18n,
        descriptionI18n: siteDescriptionI18n,
        siteTimezone: siteTimezone,
      });

      return user;
    });

    return {
      initialized: true,
      userId: createdUser.id,
      email: createdUser.email,
    };
  }

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
    const timezoneResult = await this.database.queryOne(
      'SELECT value, updatedAt FROM SystemConfig WHERE key = ?',
      ['siteTimezone']
    );

    const titleI18n = this.parseLocalizedConfigValue(titleResult?.value, DEFAULT_SITE_TITLE);
    const descriptionI18n = this.parseLocalizedConfigValue(descriptionResult?.value, DEFAULT_SITE_DESCRIPTION);
    const siteTimezone = this.normalizeSiteTimezone(timezoneResult?.value, false);
    const locale = this.resolveSiteInfoLocale(acceptLanguage);
    const title = titleI18n[locale];
    const description = descriptionI18n[locale];
    const updatedAt = this.pickLatestUpdatedAt(
      titleResult?.updatedAt,
      descriptionResult?.updatedAt,
      timezoneResult?.updatedAt,
    );

    return {
      title,
      description,
      titleI18n,
      descriptionI18n,
      siteTimezone,
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
    const nextTimezone = updateSiteInfoDto.siteTimezone !== undefined
      ? this.normalizeSiteTimezone(updateSiteInfoDto.siteTimezone, true)
      : undefined;

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

    if (nextTimezone !== undefined) {
      const existing = await this.database.queryOne(
        'SELECT key FROM SystemConfig WHERE key = ?',
        ['siteTimezone']
      );

      if (existing) {
        await this.database.run(
          'UPDATE SystemConfig SET value = ?, updatedAt = ? WHERE key = ?',
          [nextTimezone, now, 'siteTimezone']
        );
      } else {
        await this.database.run(
          'INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)',
          ['siteTimezone', nextTimezone, now]
        );
      }
    }

    return this.getSiteInfo(acceptLanguage);
  }

  private pickLatestUpdatedAt(...values: Array<string | undefined>): string {
    const valid = values
      .filter((value): value is string => Boolean(value))
      .filter((value) => Number.isFinite(new Date(value).getTime()));

    if (valid.length === 0) {
      return new Date().toISOString();
    }

    let latest = valid[0];
    for (const item of valid.slice(1)) {
      if (new Date(item).getTime() > new Date(latest).getTime()) {
        latest = item;
      }
    }

    return latest;
  }

  private normalizeSiteTimezone(value: string | undefined, strict: boolean): string {
    if (value === undefined) {
      return DEFAULT_SITE_TIMEZONE;
    }

    const raw = value.trim();
    if (!raw) {
      if (strict) {
        throw new BadRequestException('Invalid timezone format. Use UTC+8 or UTC-5:30');
      }
      return DEFAULT_SITE_TIMEZONE;
    }

    const match = raw.match(UTC_OFFSET_REGEX);
    if (!match) {
      if (strict) {
        throw new BadRequestException('Invalid timezone format. Use UTC+8 or UTC-5:30');
      }
      return DEFAULT_SITE_TIMEZONE;
    }

    const sign = match[1] as '+' | '-';
    const hours = Number(match[2]);
    const minutes = match[3] ? Number(match[3]) : 0;

    if (
      !Number.isInteger(hours)
      || !Number.isInteger(minutes)
      || hours < 0
      || hours > 14
      || minutes < 0
      || minutes > 59
      || (hours === 14 && minutes !== 0)
    ) {
      if (strict) {
        throw new BadRequestException('Invalid timezone format. Use UTC+8 or UTC-5:30');
      }
      return DEFAULT_SITE_TIMEZONE;
    }

    if (minutes === 0) {
      return `UTC${sign}${hours}`;
    }

    return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
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

  private resolveSetupLocalizedText(
    partial: LocalizedTextDto | undefined,
    legacy: string | undefined,
    fallback: LocalizedText,
  ): LocalizedText {
    const next: LocalizedText = { ...fallback };
    const legacyValue = legacy?.trim();

    if (legacyValue) {
      next['zh-CN'] = legacyValue;
      next['en-US'] = legacyValue;
    }

    if (!partial) {
      return next;
    }

    const zh = partial['zh-CN']?.trim();
    const en = partial['en-US']?.trim();

    if (zh) {
      next['zh-CN'] = zh;
    }
    if (en) {
      next['en-US'] = en;
    }

    return next;
  }

  /**
   * 获取访问配置
   */
  async getAccessConfig(): Promise<AccessConfigResponseDto> {
    const result = await this.database.queryOne(
      'SELECT value FROM SystemConfig WHERE key = ?',
      ['accessConfig']
    );

    if (result?.value) {
      try {
        return this.normalizeAccessConfig(JSON.parse(result.value));
      } catch {
        return { ...DEFAULT_ACCESS_CONFIG };
      }
    }

    return { ...DEFAULT_ACCESS_CONFIG };
  }

  /**
   * 更新访问配置
   */
  async updateAccessConfig(config: UpdateAccessConfigDto): Promise<AccessConfigResponseDto> {
    const now = new Date().toISOString();
    const current = await this.getAccessConfig();
    const next = this.normalizeAccessConfig({
      ...current,
      ...config,
    });

    const value = JSON.stringify(next);
    const existing = await this.database.queryOne(
      'SELECT key FROM SystemConfig WHERE key = ?',
      ['accessConfig']
    );

    if (existing) {
      await this.database.run(
        'UPDATE SystemConfig SET value = ?, updatedAt = ? WHERE key = ?',
        [value, now, 'accessConfig']
      );
    } else {
      await this.database.run(
        'INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)',
        ['accessConfig', value, now]
      );
    }

    return next;
  }

  private normalizeAccessConfig(raw: any): AccessConfigResponseDto {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_ACCESS_CONFIG };
    }

    return {
      allowRegistration:
        typeof raw.allowRegistration === 'boolean'
          ? raw.allowRegistration
          : DEFAULT_ACCESS_CONFIG.allowRegistration,
      allowPasswordReset:
        typeof raw.allowPasswordReset === 'boolean'
          ? raw.allowPasswordReset
          : DEFAULT_ACCESS_CONFIG.allowPasswordReset,
    };
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
