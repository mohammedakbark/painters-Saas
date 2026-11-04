import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProblemDetailsSchema } from '../common/http/problem-details.js';
import { CatalogueReadService } from './catalogue-read.service.js';
import {
  type BrandPage,
  BrandPageSchema,
  type BrandResponse,
  BrandSchema,
  type CatalogueListQuery,
  CatalogueListQuerySchema,
  type CategoryList,
  CategoryListSchema,
  type ProductListQuery,
  ProductListQuerySchema,
  type ProductPage,
  ProductPageSchema,
  type ProductResponse,
  ProductSchema,
  type ShadePage,
  ShadePageSchema,
} from './catalogue.schemas.js';

const PROBLEM = { standardSchema: ProblemDetailsSchema } as const;

/**
 * The shared brand catalogue for any signed-in user (shops pick products from
 * it in CAT-002). Only active entries; no shop data.
 */
@ApiTags('catalogue')
@ApiBearerAuth()
@ApiUnauthorizedResponse(PROBLEM)
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueReadService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Active categories, in display order.' })
  @ApiOkResponse({ standardSchema: CategoryListSchema })
  categories(): Promise<CategoryList> {
    return this.catalogue.categories();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Active brands by name.' })
  @ApiOkResponse({ standardSchema: BrandPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  brands(
    @Query({ schema: CatalogueListQuerySchema }) query: CatalogueListQuery,
  ): Promise<BrandPage> {
    return this.catalogue.brands(query);
  }

  @Get('brands/:brandId')
  @ApiOperation({ summary: 'An active brand.' })
  @ApiOkResponse({ standardSchema: BrandSchema })
  @ApiNotFoundResponse(PROBLEM)
  brand(@Param('brandId') brandId: string): Promise<BrandResponse> {
    return this.catalogue.brand(brandId);
  }

  @Get('brands/:brandId/products')
  @ApiOperation({ summary: "An active brand's active products, by name." })
  @ApiOkResponse({ standardSchema: ProductPageSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  products(
    @Param('brandId') brandId: string,
    @Query({ schema: ProductListQuerySchema }) query: ProductListQuery,
  ): Promise<ProductPage> {
    return this.catalogue.products(brandId, query);
  }

  @Get('brands/:brandId/shades')
  @ApiOperation({ summary: "An active brand's active shades, by code." })
  @ApiOkResponse({ standardSchema: ShadePageSchema })
  @ApiBadRequestResponse(PROBLEM)
  @ApiNotFoundResponse(PROBLEM)
  shades(
    @Param('brandId') brandId: string,
    @Query({ schema: CatalogueListQuerySchema }) query: CatalogueListQuery,
  ): Promise<ShadePage> {
    return this.catalogue.shades(brandId, query);
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'An active product.' })
  @ApiOkResponse({ standardSchema: ProductSchema })
  @ApiNotFoundResponse(PROBLEM)
  product(@Param('productId') productId: string): Promise<ProductResponse> {
    return this.catalogue.product(productId);
  }
}
