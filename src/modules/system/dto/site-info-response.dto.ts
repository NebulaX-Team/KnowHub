export class LocalizedTextResponseDto {
  'zh-CN': string;
  'en-US': string;
}

export class SiteInfoResponseDto {
  title: string;
  description: string;
  titleI18n: LocalizedTextResponseDto;
  descriptionI18n: LocalizedTextResponseDto;
  siteTimezone: string;
  updatedAt: string;
}
