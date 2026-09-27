import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/db';

const CREATE_HERO_SLIDES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS homepage_hero_slides (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    cta_text VARCHAR(80) NOT NULL DEFAULT '',
    cta_href VARCHAR(500) NOT NULL DEFAULT '/shop',
    media_type VARCHAR(8) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url VARCHAR(1000) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS homepage_hero_slides_order_idx
    ON homepage_hero_slides (is_active, sort_order, id);
`;

export type HeroMediaType = 'image' | 'video';

export interface HeroSlideInput {
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  mediaType: HeroMediaType;
  mediaUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HeroSlide extends HeroSlideInput {
  id: number;
}

export async function ensureHeroSlidesTable() {
  await db.query(CREATE_HERO_SLIDES_TABLE_SQL);
}

export async function getHeroSlides(activeOnly = false): Promise<HeroSlide[]> {
  await ensureHeroSlidesTable();
  const result = await db.query(
    `SELECT id, title, description, cta_text, cta_href, media_type, media_url, is_active, sort_order
     FROM homepage_hero_slides
     ${activeOnly ? 'WHERE is_active = true' : ''}
     ORDER BY sort_order ASC, id ASC`
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    ctaText: row.cta_text,
    ctaHref: row.cta_href,
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    mediaUrl: row.media_url,
    isActive: row.is_active,
    sortOrder: Number(row.sort_order),
  }));
}

export async function createHeroSlide(slide: HeroSlideInput): Promise<HeroSlide> {
  await ensureHeroSlidesTable();
  const result = await db.query(
    `INSERT INTO homepage_hero_slides (
       title, description, cta_text, cta_href, media_type, media_url, is_active, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, title, description, cta_text, cta_href, media_type, media_url, is_active, sort_order`,
    [slide.title, slide.description, slide.ctaText, slide.ctaHref, slide.mediaType, slide.mediaUrl, slide.isActive, slide.sortOrder]
  );
  const [created] = result.rows;
  return {
    id: Number(created.id),
    title: created.title,
    description: created.description,
    ctaText: created.cta_text,
    ctaHref: created.cta_href,
    mediaType: created.media_type,
    mediaUrl: created.media_url,
    isActive: created.is_active,
    sortOrder: Number(created.sort_order),
  };
}

export async function updateHeroSlide(id: number, slide: HeroSlideInput): Promise<HeroSlide | null> {
  await ensureHeroSlidesTable();
  const result = await db.query(
    `UPDATE homepage_hero_slides
     SET title = $2, description = $3, cta_text = $4, cta_href = $5,
         media_type = $6, media_url = $7, is_active = $8, sort_order = $9, updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, cta_text, cta_href, media_type, media_url, is_active, sort_order`,
    [id, slide.title, slide.description, slide.ctaText, slide.ctaHref, slide.mediaType, slide.mediaUrl, slide.isActive, slide.sortOrder]
  );
  const [updated] = result.rows;
  if (!updated) return null;
  return {
    id: Number(updated.id),
    title: updated.title,
    description: updated.description,
    ctaText: updated.cta_text,
    ctaHref: updated.cta_href,
    mediaType: updated.media_type,
    mediaUrl: updated.media_url,
    isActive: updated.is_active,
    sortOrder: Number(updated.sort_order),
  };
}

export async function deleteHeroSlide(id: number): Promise<boolean> {
  await ensureHeroSlidesTable();
  const result = await db.query('DELETE FROM homepage_hero_slides WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function saveHeroMedia(file: File, mediaType: HeroMediaType): Promise<string> {
  const allowedTypes = mediaType === 'image'
    ? new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    : new Set(['video/mp4', 'video/webm', 'video/quicktime']);
  const allowedExtensions = mediaType === 'image'
    ? new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
    : new Set(['.mp4', '.webm', '.mov']);
  const extension = path.extname(file.name).toLowerCase();

  if (!allowedTypes.has(file.type) || !allowedExtensions.has(extension)) {
    throw new Error(`Choose a supported ${mediaType} file.`);
  }
  if (file.size <= 0 || file.size > 150 * 1024 * 1024) {
    throw new Error('Hero media must be smaller than 150 MB.');
  }

  const folder = mediaType === 'image' ? 'images' : 'videos';
  const filename = `${randomUUID()}${extension}`;
  const uploadDirectory = path.join(process.cwd(), 'public', 'uploads', 'hero', folder);
  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/hero/${folder}/${filename}`;
}