import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser, CurrentUser as CurrentUserType } from '@/common/decorators/current-user.decorator';
import { LibraryService } from './library.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { LibraryResponseDto } from './dto/library-response.dto';

@Controller('libraries')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post()
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() createLibraryDto: CreateLibraryDto
  ): Promise<LibraryResponseDto> {
    return this.libraryService.create(user.id, createLibraryDto);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserType): Promise<LibraryResponseDto[]> {
    return this.libraryService.findAll(user.id);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string
  ): Promise<LibraryResponseDto> {
    return this.libraryService.findOne(user.id, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() updateLibraryDto: UpdateLibraryDto
  ): Promise<LibraryResponseDto> {
    console.debug('LibraryController.update received:', { id, userId: user.id, body: updateLibraryDto });
    return this.libraryService.update(user.id, id, updateLibraryDto);
  }

  @Delete(':id')

  async remove(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string
  ) {
    return this.libraryService.remove(user.id, id);
  }
}
