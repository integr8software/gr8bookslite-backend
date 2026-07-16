import { Body, Controller, Delete, Headers, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VpsStorageInternalService } from './vps-storage-internal.service';

type UploadedStorageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller({
  path: 'storage/internal',
  version: '1',
})
export class VpsStorageInternalController {
  constructor(private readonly vpsStorageInternalService: VpsStorageInternalService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Headers('authorization') authorization: string | undefined,
    @Body('storageEnv') storageEnv: string,
    @Body('folder') folder: string,
    @UploadedFile() file: UploadedStorageFile | undefined,
  ) {
    return this.vpsStorageInternalService.upload({
      authorization,
      storageEnv,
      folder,
      file,
    });
  }

  @Delete('file')
  delete(@Headers('authorization') authorization: string | undefined, @Body('relativePath') relativePath: string) {
    return this.vpsStorageInternalService.delete({
      authorization,
      relativePath,
    });
  }
}
