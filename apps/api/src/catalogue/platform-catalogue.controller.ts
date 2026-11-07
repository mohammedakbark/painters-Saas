import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, type CurrentUserContext } from '../auth/current-user.js';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { IMAGE_LIMITS } from '../media/image-processor.js';
import { PlatformAdminOnly } from '../platform-admin/platform-admin.guard.js';
import { CatalogueAdminService } from './catalogue-admin.service.js';
import {
  CatalogueImportService,
  IMPORT_LIMITS,
} from './catalogue-import.service.js';
import {
  type BrandResponse,
  BrandSchema,
  type CatalogueListQuery,
  CatalogueListQuerySchema,
  type PlatformBrandListQuery,
  PlatformBrandListQuerySchema,
  type PlatformBrandPage,
  PlatformBrandPageSchema,
  type PlatformProductListQuery,
  PlatformProductListQuerySchema,
  type PlatformProductPage,
  PlatformProductPageSchema,
  type Category,
  type CategoryList,
  CategoryListSchema,
  CategorySchema,
  type CreateBrandRequest,
  CreateBrandRequestSchema,
  type CreateCategoryRequest,
  CreateCategoryRequestSchema,
  type CreateProductRequest,
  CreateProductRequestSchema,
  type CreateShadeRequest,
  CreateShadeRequestSchema,
  type ImportQuery,
  ImportQuerySchema,
  type ImportResult,
  ImportResultSchema,
  type ProductResponse,
  ProductSchema,
  type ShadePage,
  ShadePageSchema,
  type ShadeResponse,
  ShadeSchema,
  type UpdateBrandRequest,
  UpdateBrandRequestSchema,
  type UpdateCategoryRequest,
  UpdateCategoryRequestSchema,
  type UpdateProductRequest,
  UpdateProductRequestSchema,
  type UpdateShadeRequest,
  UpdateShadeRequestSchema,
} from './catalogue.schemas.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;
const FILE_BODY = (field: string) => ({
  schema: {
    type: 'object',
    required: [field],
    properties: { [field]: { type: 'string', format: 'binary' } },
  },
});

interface UploadedBuffer {
  buffer: Buffer;
}

/** Platform-admin management of the shared brand catalogue (CAT-001). */
@ApiTags('platform catalogue')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@PlatformAdminOnly()
@Controller('platform/catalogue')
export class PlatformCatalogueController {
  constructor(
    private readonly catalogue: CatalogueAdminService,
    private readonly imports: CatalogueImportService,
  ) {}

  // --- Categories ------------------------------------------------------------

  @Get('categories')
  @ApiOperation({ summary: 'All categories, including archived ones.' })
  @ApiOkResponse({ standardSchema: CategoryListSchema })
  listCategories(): Promise<CategoryList> {
    return this.catalogue.listCategories();
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a category.' })
  @ApiCreatedResponse({ standardSchema: CategorySchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  createCategory(
    @CurrentUser() user: CurrentUserContext,
    @Body({ schema: CreateCategoryRequestSchema }) body: CreateCategoryRequest,
  ): Promise<Category> {
    return this.catalogue.createCategory(user, body);
  }

  @Patch('categories/:categoryId')
  @ApiOperation({ summary: 'Rename, reorder, archive or restore a category.' })
  @ApiOkResponse({ standardSchema: CategorySchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  updateCategory(
    @CurrentUser() user: CurrentUserContext,
    @Param('categoryId') categoryId: string,
    @Body({ schema: UpdateCategoryRequestSchema }) body: UpdateCategoryRequest,
  ): Promise<Category> {
    return this.catalogue.updateCategory(user, categoryId, body);
  }

  // --- Brands ----------------------------------------------------------------

  @Get('brands')
  @ApiOperation({ summary: 'All brands by name, including archived ones.' })
  @ApiOkResponse({ standardSchema: PlatformBrandPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  listBrands(
    @Query({ schema: PlatformBrandListQuerySchema })
    query: PlatformBrandListQuery,
  ): Promise<PlatformBrandPage> {
    return this.catalogue.listBrands(query);
  }

  @Post('brands')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a brand.' })
  @ApiCreatedResponse({ standardSchema: BrandSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  createBrand(
    @CurrentUser() user: CurrentUserContext,
    @Body({ schema: CreateBrandRequestSchema }) body: CreateBrandRequest,
  ): Promise<BrandResponse> {
    return this.catalogue.createBrand(user, body);
  }

  @Get('brands/:brandId')
  @ApiOperation({
    summary: 'A brand with its active product and shade counts.',
  })
  @ApiOkResponse({ standardSchema: BrandSchema })
  @ApiNotFoundResponse(PROBLEM)
  getBrand(@Param('brandId') brandId: string): Promise<BrandResponse> {
    return this.catalogue.getBrand(brandId);
  }

  @Patch('brands/:brandId')
  @ApiOperation({ summary: 'Rename, archive or restore a brand.' })
  @ApiOkResponse({ standardSchema: BrandSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  updateBrand(
    @CurrentUser() user: CurrentUserContext,
    @Param('brandId') brandId: string,
    @Body({ schema: UpdateBrandRequestSchema }) body: UpdateBrandRequest,
  ): Promise<BrandResponse> {
    return this.catalogue.updateBrand(user, brandId, body);
  }

  // --- Products --------------------------------------------------------------

  @Get('brands/:brandId/products')
  @ApiOperation({
    summary: "A brand's products by name, including archived ones.",
  })
  @ApiOkResponse({ standardSchema: PlatformProductPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  listProducts(
    @Param('brandId') brandId: string,
    @Query({ schema: PlatformProductListQuerySchema })
    query: PlatformProductListQuery,
  ): Promise<PlatformProductPage> {
    return this.catalogue.listProducts(brandId, query);
  }

  @Post('brands/:brandId/products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product with its pack sizes.' })
  @ApiCreatedResponse({ standardSchema: ProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  createProduct(
    @CurrentUser() user: CurrentUserContext,
    @Param('brandId') brandId: string,
    @Body({ schema: CreateProductRequestSchema }) body: CreateProductRequest,
  ): Promise<ProductResponse> {
    return this.catalogue.createProduct(user, brandId, body);
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'A catalogue product, archived or not.' })
  @ApiOkResponse({ standardSchema: ProductSchema })
  @ApiNotFoundResponse(PROBLEM)
  getProduct(@Param('productId') productId: string): Promise<ProductResponse> {
    return this.catalogue.getProduct(productId);
  }

  @Patch('products/:productId')
  @ApiOperation({
    summary: 'Change, archive or restore a product, or replace its pack sizes.',
  })
  @ApiOkResponse({ standardSchema: ProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  updateProduct(
    @CurrentUser() user: CurrentUserContext,
    @Param('productId') productId: string,
    @Body({ schema: UpdateProductRequestSchema }) body: UpdateProductRequest,
  ): Promise<ProductResponse> {
    return this.catalogue.updateProduct(user, productId, body);
  }

  @Put('products/:productId/image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: IMAGE_LIMITS.maxBytes, files: 1, fields: 0 },
    }),
  )
  @ApiOperation({
    summary:
      'Replace the product image (re-encoded to WebP, metadata removed).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY('image'))
  @ApiOkResponse({ standardSchema: ProductSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  replaceProductImage(
    @CurrentUser() user: CurrentUserContext,
    @Param('productId') productId: string,
    @UploadedFile() file: UploadedBuffer | undefined,
  ): Promise<ProductResponse> {
    return this.catalogue.replaceProductImage(user, productId, file?.buffer);
  }

  // --- Shades ----------------------------------------------------------------

  @Get('brands/:brandId/shades')
  @ApiOperation({
    summary: "A brand's shades by code, including archived ones.",
  })
  @ApiOkResponse({ standardSchema: ShadePageSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  listShades(
    @Param('brandId') brandId: string,
    @Query({ schema: CatalogueListQuerySchema }) query: CatalogueListQuery,
  ): Promise<ShadePage> {
    return this.catalogue.listShades(brandId, query);
  }

  @Post('brands/:brandId/shades')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a shade.' })
  @ApiCreatedResponse({ standardSchema: ShadeSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  createShade(
    @CurrentUser() user: CurrentUserContext,
    @Param('brandId') brandId: string,
    @Body({ schema: CreateShadeRequestSchema }) body: CreateShadeRequest,
  ): Promise<ShadeResponse> {
    return this.catalogue.createShade(user, brandId, body);
  }

  @Patch('shades/:shadeId')
  @ApiOperation({ summary: 'Change, archive or restore a shade.' })
  @ApiOkResponse({ standardSchema: ShadeSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  @ApiConflictResponse(PROBLEM)
  updateShade(
    @CurrentUser() user: CurrentUserContext,
    @Param('shadeId') shadeId: string,
    @Body({ schema: UpdateShadeRequestSchema }) body: UpdateShadeRequest,
  ): Promise<ShadeResponse> {
    return this.catalogue.updateShade(user, shadeId, body);
  }

  // --- CSV import ------------------------------------------------------------

  @Post('brands/:brandId/imports/shades')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: IMPORT_LIMITS.maxBytes, files: 1, fields: 0 },
    }),
  )
  @ApiOperation({
    summary:
      'Import shades from CSV (code,name[,preview_hex]). All-or-nothing; dryRun=true (default) only checks.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY('file'))
  @ApiOkResponse({ standardSchema: ImportResultSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  importShades(
    @CurrentUser() user: CurrentUserContext,
    @Param('brandId') brandId: string,
    @Query({ schema: ImportQuerySchema }) query: ImportQuery,
    @UploadedFile() file: UploadedBuffer | undefined,
  ): Promise<ImportResult> {
    return this.imports.importShades(
      user,
      brandId,
      file?.buffer,
      query.dryRun === 'true',
    );
  }

  @Post('brands/:brandId/imports/products')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: IMPORT_LIMITS.maxBytes, files: 1, fields: 0 },
    }),
  )
  @ApiOperation({
    summary:
      'Import products from CSV (name,category,packs[,description][,supports_shades]). All-or-nothing; dryRun=true (default) only checks.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY('file'))
  @ApiOkResponse({ standardSchema: ImportResultSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  importProducts(
    @CurrentUser() user: CurrentUserContext,
    @Param('brandId') brandId: string,
    @Query({ schema: ImportQuerySchema }) query: ImportQuery,
    @UploadedFile() file: UploadedBuffer | undefined,
  ): Promise<ImportResult> {
    return this.imports.importProducts(
      user,
      brandId,
      file?.buffer,
      query.dryRun === 'true',
    );
  }
}
