import { Controller, Post, Get, Delete, Put, Param, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DatabaseService } from '../../database/database.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly database: DatabaseService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, cb) => {
       if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
           return cb(new BadRequestException('Only image files are allowed!'), false);
       }
       cb(null, true);
    }
  }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    if (!file) {
        throw new BadRequestException('File is required');
    }

    // 从 req.body 获取 pageId 和 libraryId（multer 会将非文件字段放在 body 中）
    const pageId = req.body.pageId || null;
    const libraryId = req.body.libraryId || null;

    const url = `/uploads/${file.filename}`;
    const id = randomUUID();
    const now = new Date().toISOString();

    console.debug('=== Upload Image Debug ===');
    console.debug('req.body:', req.body);
    console.debug('pageId:', pageId, 'type:', typeof pageId);
    console.debug('libraryId:', libraryId, 'type:', typeof libraryId);
    console.debug('userId:', userId);
    console.debug('=========================');

    // 记录上传的图片信息
    await this.database.run(
      `INSERT INTO UploadedImage (id, filename, originalName, mimeType, size, url, pageId, libraryId, userId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, file.filename, file.originalname, file.mimetype, file.size, url, pageId, libraryId, userId, now]
    );

    return {
      id,
      url,
    };
  }

  @Get('images')
  async getImages(@CurrentUser('id') userId: string) {
    const images = await this.database.queryAll(
      `SELECT 
        ui.id,
        ui.filename,
        ui.originalName,
        ui.mimeType,
        ui.size,
        ui.url,
        ui.pageId,
        ui.libraryId,
        ui.createdAt,
        p.title as pageTitle,
        p.type as pageType,
        lib.title as libraryTitle
      FROM UploadedImage ui
      LEFT JOIN Page p ON ui.pageId = p.id
      LEFT JOIN Page lib ON ui.libraryId = lib.id
      WHERE ui.userId = ?
      ORDER BY ui.createdAt DESC`,
      [userId]
    );

    return images;
  }

  @Delete('images/:id')
  async deleteImage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // 获取图片信息
    const image = await this.database.queryOne(
      'SELECT * FROM UploadedImage WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (!image) {
      throw new BadRequestException('Image not found or unauthorized');
    }

    // 1. 删除物理文件
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 2. 从所有页面的content中移除该图片的引用
    const imageUrl = image.url;
    
    // 查找所有可能包含该图片的页面（包括library类型的页面）
    const pagesWithImage = await this.database.queryAll(
      `SELECT id, content FROM Page WHERE userId = ? AND content LIKE ?`,
      [userId, `%${imageUrl}%`]
    );

    // 更新每个页面，移除图片节点
    for (const page of pagesWithImage) {
      try {
        const content = JSON.parse(page.content);
        const updatedContent = this.removeImageFromContent(content, imageUrl);
        
        await this.database.run(
          'UPDATE Page SET content = ?, updatedAt = ? WHERE id = ?',
          [JSON.stringify(updatedContent), new Date().toISOString(), page.id]
        );
      } catch (error) {
        console.error(`Failed to update page ${page.id}:`, error);
        // 继续处理其他页面，不中断删除流程
      }
    }

    // 3. 从数据库中删除图片记录
    await this.database.run('DELETE FROM UploadedImage WHERE id = ?', [id]);

    return { 
      success: true,
      updatedPages: pagesWithImage.length 
    };
  }

  @Put('images/:id/replace')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, cb) => {
       if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
           return cb(new BadRequestException('Only image files are allowed!'), false);
       }
       cb(null, true);
    }
  }))
  async replaceImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
        throw new BadRequestException('File is required');
    }

    // 获取原图片信息
    const oldImage = await this.database.queryOne(
      'SELECT * FROM UploadedImage WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (!oldImage) {
      throw new BadRequestException('Image not found or unauthorized');
    }

    console.debug('=== Replace Image Debug ===');
    console.debug('Old image:', oldImage);
    console.debug('New file:', file.filename, file.originalname);
    console.debug('process.cwd():', process.cwd());

    // 使用与 main.ts 相同的路径逻辑
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    console.debug('Upload directory:', uploadDir);

    // 删除旧的物理文件
    const oldFilePath = path.join(uploadDir, oldImage.filename);
    console.debug('Old file path:', oldFilePath);
    console.debug('Old file exists:', fs.existsSync(oldFilePath));
    
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.debug('Old file deleted');
    }

    // 将新上传的文件重命名为旧文件名（保持URL不变）
    const newFilePath = path.join(uploadDir, file.filename);
    const targetFilePath = oldFilePath; // 使用旧文件的路径
    
    console.debug('New file path:', newFilePath);
    console.debug('New file exists:', fs.existsSync(newFilePath));
    console.debug('Target file path:', targetFilePath);
    
    // 确保新文件存在后再重命名
    if (fs.existsSync(newFilePath)) {
      fs.renameSync(newFilePath, targetFilePath);
      console.debug('File renamed successfully');
    } else {
      console.debug('ERROR: New file not found!');
      throw new BadRequestException('Uploaded file not found');
    }
    console.debug('=========================');

    // 更新数据库记录（保持 filename 和 url 不变，更新文件元信息包括原始文件名）
    const now = new Date().toISOString();

    await this.database.run(
      `UPDATE UploadedImage 
       SET originalName = ?, mimeType = ?, size = ?, createdAt = ?
       WHERE id = ?`,
      [file.originalname, file.mimetype, file.size, now, id]
    );

    return {
      id,
      url: oldImage.url, // URL 保持不变
      timestamp: now, // 用于前端破坏缓存
    };
  }

  /**
   * 递归遍历Tiptap content，移除指定URL的图片节点
   */
  private removeImageFromContent(content: any, imageUrl: string): any {
    if (!content) return content;

    // 如果是图片节点且URL匹配，返回null（将被过滤掉）
    if (content.type === 'image' && content.attrs?.src === imageUrl) {
      return null;
    }

    // 如果有子节点，递归处理
    if (content.content && Array.isArray(content.content)) {
      content.content = content.content
        .map((child: any) => this.removeImageFromContent(child, imageUrl))
        .filter((child: any) => child !== null); // 过滤掉被标记为删除的节点
    }

    return content;
  }
}
