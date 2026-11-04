import { HttpStatus, Injectable } from '@nestjs/common';
import { CsvError, parse } from 'csv-parse/sync';
import { z } from 'zod';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PackUnit } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { notFound } from './catalogue-mapping.js';
import type { ImportResult } from './catalogue.schemas.js';
import {
  CATALOGUE_LIMITS as L,
  nameKey,
  normaliseHex,
  normaliseShadeCode,
  normaliseText,
  type PackSize,
  packKey,
  parsePackSize,
  SHADE_CODE,
} from './catalogue-text.js';

/**
 * CSV import of a brand's shades or products (CAT-001, D-030). Platform admins
 * fill the catalogue from official shade cards and price lists; brand
 * websites are never scraped. An import is all-or-nothing: any row error and
 * nothing is saved. A dry run reports what would happen.
 *
 * Shades:   code,name[,preview_hex]
 * Products: name,category,packs[,description][,supports_shades]
 *           packs like "1 L; 4 L; 10 L; 20 L"; supports_shades yes/no.
 *
 * Existing rows are matched by shade code / product name (case-insensitive)
 * and updated; product pack sizes are only added, never removed.
 */
export const IMPORT_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxRows: 5000,
} as const;

const MAX_LISTED_ERRORS = 100;
const COLUMNS = {
  shades: { required: ['code', 'name'], optional: ['preview_hex'] },
  products: {
    required: ['name', 'category', 'packs'],
    optional: ['description', 'supports_shades'],
  },
} as const;

type Kind = keyof typeof COLUMNS;
type Row = Record<string, string>;
interface RowError {
  row: number;
  message: string;
}

const idSchema = z.uuid();

@Injectable()
export class CatalogueImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importShades(
    user: CurrentUserContext,
    brandId: string,
    file: Buffer | undefined,
    dryRun: boolean,
  ): Promise<ImportResult> {
    await this.requireBrand(brandId);
    const parsed = parseCsv(file, 'shades');
    if ('result' in parsed) {
      return parsed.result;
    }
    const errors: RowError[] = [];
    const seen = new Set<string>();
    const shades: {
      row: number;
      code: string;
      name: string;
      previewHex: string | null;
    }[] = [];

    parsed.rows.forEach((raw, index) => {
      const row = index + 1;
      const code = normaliseShadeCode(raw.code ?? '');
      const name = normaliseText(raw.name ?? '');
      const hexText = (raw.preview_hex ?? '').trim();
      const previewHex = hexText === '' ? null : normaliseHex(hexText);
      if (!SHADE_CODE.test(code)) {
        errors.push({
          row,
          message:
            'The shade code is missing or has characters that are not allowed.',
        });
      } else if (seen.has(code)) {
        errors.push({
          row,
          message: `Shade code ${code} appears more than once in the file.`,
        });
      }
      seen.add(code);
      if (name.length < L.shadeName.min || name.length > L.shadeName.max) {
        errors.push({
          row,
          message: `The shade name must be 1–${L.shadeName.max} characters.`,
        });
      }
      if (hexText !== '' && previewHex === null) {
        errors.push({
          row,
          message: 'preview_hex must be a colour like #E8D5B7.',
        });
      }
      shades.push({ row, code, name, previewHex });
    });

    const existing = new Map(
      (
        await this.prisma.shade.findMany({
          where: { brandId, code: { in: shades.map((s) => s.code) } },
          select: { id: true, code: true, name: true, previewHex: true },
        })
      ).map((shade) => [shade.code, shade]),
    );
    const toCreate = shades.filter((s) => !existing.has(s.code));
    const toUpdate = shades.filter((s) => {
      const current = existing.get(s.code);
      return (
        current &&
        (current.name !== s.name || current.previewHex !== s.previewHex)
      );
    });

    const result = summary(
      'shades',
      dryRun,
      shades.length,
      toCreate.length,
      toUpdate.length,
      errors,
    );
    if (!result.applied) {
      return result;
    }
    await this.prisma.$transaction(
      async (tx) => {
        await tx.shade.createMany({
          data: toCreate.map(({ code, name, previewHex }) => ({
            brandId,
            code,
            name,
            previewHex,
          })),
        });
        for (const shade of toUpdate) {
          await tx.shade.update({
            where: { id: existing.get(shade.code)?.id },
            data: { name: shade.name, previewHex: shade.previewHex },
          });
        }
        await this.audit(tx, user, brandId, result);
      },
      { timeout: 60_000 },
    );
    return result;
  }

  async importProducts(
    user: CurrentUserContext,
    brandId: string,
    file: Buffer | undefined,
    dryRun: boolean,
  ): Promise<ImportResult> {
    await this.requireBrand(brandId);
    const parsed = parseCsv(file, 'products');
    if ('result' in parsed) {
      return parsed.result;
    }
    const categories = new Map(
      (
        await this.prisma.catalogueCategory.findMany({
          where: { active: true },
          select: { id: true, nameKey: true },
        })
      ).map((category) => [category.nameKey, category.id]),
    );

    const errors: RowError[] = [];
    const seen = new Set<string>();
    const products: {
      row: number;
      name: string;
      key: string;
      categoryId: string | undefined;
      description: string | null;
      supportsShades: boolean;
      packs: PackSize[];
    }[] = [];

    parsed.rows.forEach((raw, index) => {
      const row = index + 1;
      const name = normaliseText(raw.name ?? '');
      const key = nameKey(name);
      if (name.length < L.productName.min || name.length > L.productName.max) {
        errors.push({
          row,
          message: `The product name must be ${L.productName.min}–${L.productName.max} characters.`,
        });
      } else if (seen.has(key)) {
        errors.push({
          row,
          message: `Product "${name}" appears more than once in the file.`,
        });
      }
      seen.add(key);

      const categoryId = categories.get(nameKey(raw.category ?? ''));
      if (!categoryId) {
        errors.push({
          row,
          message: 'The category is not an active catalogue category.',
        });
      }

      const description = normaliseText(raw.description ?? '');
      if (description.length > L.description.max) {
        errors.push({
          row,
          message: `The description must be at most ${L.description.max} characters.`,
        });
      }

      const supportsShades = yesNo(raw.supports_shades);
      if (supportsShades === null) {
        errors.push({ row, message: 'supports_shades must be yes or no.' });
      }

      const packs = parsePacks(raw.packs ?? '');
      if (typeof packs === 'string') {
        errors.push({ row, message: packs });
      }

      products.push({
        row,
        name,
        key,
        categoryId,
        description: description === '' ? null : description,
        supportsShades: supportsShades ?? false,
        packs: typeof packs === 'string' ? [] : packs,
      });
    });

    const existing = new Map(
      (
        await this.prisma.catalogueProduct.findMany({
          where: { brandId, nameKey: { in: products.map((p) => p.key) } },
          select: {
            id: true,
            nameKey: true,
            categoryId: true,
            description: true,
            supportsShades: true,
            packs: { select: { quantity: true, unit: true } },
          },
        })
      ).map((product) => [product.nameKey, product]),
    );

    const toCreate = products.filter((p) => !existing.has(p.key));
    const toUpdate = products.flatMap((p) => {
      const current = existing.get(p.key);
      if (!current) {
        return [];
      }
      const currentPacks = new Set(
        current.packs.map((pack) =>
          packKey({ quantity: pack.quantity.toNumber(), unit: pack.unit }),
        ),
      );
      const newPacks = p.packs.filter(
        (pack) => !currentPacks.has(packKey(pack)),
      );
      const fieldsChanged =
        current.categoryId !== p.categoryId ||
        current.description !== p.description ||
        current.supportsShades !== p.supportsShades;
      return fieldsChanged || newPacks.length > 0
        ? [{ ...p, id: current.id, newPacks }]
        : [];
    });

    const result = summary(
      'products',
      dryRun,
      products.length,
      toCreate.length,
      toUpdate.length,
      errors,
    );
    if (!result.applied) {
      return result;
    }
    await this.prisma.$transaction(
      async (tx) => {
        for (const p of toCreate) {
          await tx.catalogueProduct.create({
            data: {
              brandId,
              categoryId: p.categoryId as string,
              name: p.name,
              nameKey: p.key,
              description: p.description,
              supportsShades: p.supportsShades,
              packs: { create: p.packs.map(packData) },
            },
          });
        }
        for (const p of toUpdate) {
          await tx.catalogueProduct.update({
            where: { id: p.id },
            data: {
              categoryId: p.categoryId,
              description: p.description,
              supportsShades: p.supportsShades,
              packs: { create: p.newPacks.map(packData) },
            },
          });
        }
        await this.audit(tx, user, brandId, result);
      },
      { timeout: 60_000 },
    );
    return result;
  }

  private async requireBrand(brandId: string): Promise<void> {
    const found = idSchema.safeParse(brandId).success
      ? await this.prisma.brand.findUnique({
          where: { id: brandId },
          select: { id: true },
        })
      : null;
    if (!found) {
      throw notFound('brand');
    }
  }

  private audit(
    tx: Prisma.TransactionClient,
    user: CurrentUserContext,
    brandId: string,
    result: ImportResult,
  ): Promise<void> {
    return recordAuditEvent(tx, {
      actor: { type: 'USER', userId: user.id },
      action: AuditAction.CatalogueImported,
      entityType: 'brand',
      entityId: brandId,
      metadata: {
        kind: result.kind,
        rows: result.rows,
        created: result.created,
        updated: result.updated,
      },
    });
  }
}

/** Parses the upload into header-keyed rows, or returns a failed result. */
function parseCsv(
  file: Buffer | undefined,
  kind: Kind,
): { rows: Row[] } | { result: ImportResult } {
  const fail = (message: string): { result: ImportResult } => ({
    result: summary(kind, true, 0, 0, 0, [{ row: 0, message }]),
  });
  if (!file || file.length === 0) {
    throw new ProblemException(HttpStatus.BAD_REQUEST, {
      detail: 'Choose a CSV file to import.',
      code: 'import_file_required',
    });
  }
  if (file.length > IMPORT_LIMITS.maxBytes) {
    throw new ProblemException(HttpStatus.PAYLOAD_TOO_LARGE, {
      detail: 'The CSV file must be 2 MB or smaller.',
      code: 'import_too_large',
    });
  }

  let records: Row[];
  try {
    records = parse(file, {
      columns: (header: string[]) =>
        header.map((name) => name.trim().toLowerCase()),
      bom: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 10_000,
    }) as Row[];
  } catch (error) {
    // csv-parse messages can quote file content; report the line only.
    const line =
      error instanceof CsvError
        ? (error as CsvError & { lines?: number }).lines
        : undefined;
    return fail(
      `The file is not valid CSV${line ? ` (near line ${line})` : ''}. Save it as CSV (comma-separated) and try again.`,
    );
  }

  const header = records.length > 0 ? Object.keys(records[0]) : [];
  const { required, optional } = COLUMNS[kind];
  const allowed = new Set<string>([...required, ...optional]);
  const missing = required.filter((column) => !header.includes(column));
  const unknown = header.filter((column) => !allowed.has(column));
  if (records.length === 0) {
    return fail(
      `The file has no data rows. The first line must be the header: ${required.join(',')}.`,
    );
  }
  if (missing.length > 0 || unknown.length > 0) {
    return fail(
      [
        missing.length > 0 ? `Missing columns: ${missing.join(', ')}.` : '',
        unknown.length > 0 ? `Unknown columns: ${unknown.join(', ')}.` : '',
        `Allowed columns: ${[...required, ...optional].join(', ')}.`,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }
  if (records.length > IMPORT_LIMITS.maxRows) {
    return fail(
      `The file has ${records.length} rows; import at most ${IMPORT_LIMITS.maxRows} at a time.`,
    );
  }
  return { rows: records };
}

function summary(
  kind: Kind,
  dryRun: boolean,
  rows: number,
  created: number,
  updated: number,
  errors: readonly RowError[],
): ImportResult {
  return {
    kind,
    dryRun,
    applied: !dryRun && errors.length === 0 && rows > 0,
    rows,
    created: errors.length === 0 ? created : 0,
    updated: errors.length === 0 ? updated : 0,
    unchanged: errors.length === 0 ? rows - created - updated : 0,
    errors: errors.slice(0, MAX_LISTED_ERRORS),
    errorCount: errors.length,
  };
}

/** Empty means no; null for anything that is not yes/no. */
function yesNo(value: string | undefined): boolean | null {
  const text = (value ?? '').trim().toLowerCase();
  if (['', 'no', 'n', 'false', '0'].includes(text)) {
    return false;
  }
  return ['yes', 'y', 'true', '1'].includes(text) ? true : null;
}

/** "1 L; 4 L, 10 L | 20 L" → pack sizes, or an error message. */
function parsePacks(text: string): PackSize[] | string {
  const parts = text
    .split(/[;,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return 'Add at least one pack size, for example "1 L; 4 L".';
  }
  if (parts.length > L.packsPerProduct) {
    return `Add at most ${L.packsPerProduct} pack sizes.`;
  }
  const packs: PackSize[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const pack = parsePackSize(part);
    if (!pack) {
      return `"${part.slice(0, 20)}" is not a pack size. Use a number and a unit: L, ml, kg, g or pc.`;
    }
    if (!seen.has(packKey(pack))) {
      seen.add(packKey(pack));
      packs.push(pack);
    }
  }
  return packs;
}

function packData(pack: { quantity: number; unit: PackUnit }) {
  return {
    quantity: new Prisma.Decimal(pack.quantity.toFixed(3)),
    unit: pack.unit,
  };
}
