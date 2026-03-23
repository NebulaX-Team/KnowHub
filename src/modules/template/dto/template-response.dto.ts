export class TemplateResponseDto {
  id: string;
  title: string;
  description?: string | null;
  content: Record<string, unknown>;
  category?: string | null;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
}
