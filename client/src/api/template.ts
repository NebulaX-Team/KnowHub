import { api } from './http'
import type { ApiResponse, Template } from '@/types'

export interface CreateTemplateRequest {
  title: string
  description?: string
  content?: any
  category?: string
}

export interface UpdateTemplateRequest {
  title?: string
  description?: string
  content?: any
  category?: string
}

export interface TemplateQueryParams {
  keyword?: string
  category?: string
}

export const templateApi = {
  getTemplates: async (params?: TemplateQueryParams): Promise<ApiResponse<Template[]>> => {
    return api.get('/templates', { params })
  },

  getTemplate: async (id: string): Promise<ApiResponse<Template>> => {
    return api.get(`/templates/${id}`)
  },

  createTemplate: async (data: CreateTemplateRequest): Promise<ApiResponse<Template>> => {
    return api.post('/templates', data)
  },

  updateTemplate: async (id: string, data: UpdateTemplateRequest): Promise<ApiResponse<Template>> => {
    return api.put(`/templates/${id}`, data)
  },

  deleteTemplate: async (id: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return api.delete(`/templates/${id}`)
  },

  duplicateTemplate: async (id: string): Promise<ApiResponse<Template>> => {
    return api.post(`/templates/${id}/duplicate`)
  },
}
