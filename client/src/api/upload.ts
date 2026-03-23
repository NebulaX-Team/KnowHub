import httpClient from './http'

export const uploadApi = {
  async uploadImage(file: File, pageId?: string, libraryId?: string) {
    console.debug('=== uploadImage called ===');
    console.debug('file:', file.name);
    console.debug('pageId:', pageId);
    console.debug('libraryId:', libraryId);
    
    const formData = new FormData()
    formData.append('file', file)
    if (pageId) {
      formData.append('pageId', pageId)
      console.debug('Added pageId to formData');
    }
    if (libraryId) {
      formData.append('libraryId', libraryId)
      console.debug('Added libraryId to formData');
    }
    
    // Log FormData contents
    console.debug('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.debug(`  ${key}:`, value);
    }
    
    const response = await httpClient.post<any>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    // Handle NestJS ResponseInterceptor format: { code: 0, data: { url: '...' } }
    return response.data?.data || response.data
  },

  async getImages() {
    const response = await httpClient.get<any>('/upload/images')
    return response.data?.data || response.data
  },

  async deleteImage(id: string) {
    const response = await httpClient.delete<any>(`/upload/images/${id}`)
    return response.data?.data || response.data
  },

  async replaceImage(id: string, formData: FormData) {
    const response = await httpClient.put<any>(`/upload/images/${id}/replace`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data?.data || response.data
  },
}
