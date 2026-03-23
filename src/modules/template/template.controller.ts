import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TemplateService } from './template.service';
import { TemplateQueryDto } from './dto/template-query.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: TemplateQueryDto,
  ) {
    return this.templateService.findAll(userId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.templateService.findOne(userId, id);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    return this.templateService.create(userId, createTemplateDto);
  }

  @Put(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templateService.update(userId, id, updateTemplateDto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.templateService.remove(userId, id);
  }

  @Post(':id/duplicate')
  async duplicate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.templateService.duplicate(userId, id);
  }
}
