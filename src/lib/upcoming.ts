import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

const CREATE_UPCOMING_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS waiting_list_entries (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS launch_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    upcoming_enabled BOOLEAN NOT NULL DEFAULT true,
    base_count INTEGER NOT NULL DEFAULT 0 CHECK (base_count >= 0),
    tshirt_release_at TIMESTAMPTZ NOT NULL,
    movie_release_at TIMESTAMPTZ NOT NULL,
    logo_image_url VARCHAR(500) NOT NULL DEFAULT '/images/michale copy2.png',
    background_mode VARCHAR(16) NOT NULL DEFAULT 'slider',
    background_video_url VARCHAR(500),
    background_audio_url VARCHAR(500),
    background_slider_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE launch_settings
    ADD COLUMN IF NOT EXISTS upcoming_enabled BOOLEAN NOT NULL DEFAULT true;

  ALTER TABLE launch_settings
    ADD COLUMN IF NOT EXISTS logo_image_url VARCHAR(500) NOT NULL DEFAULT '/images/michale copy2.png';

  ALTER TABLE launch_settings
    ADD COLUMN IF NOT EXISTS background_mode VARCHAR(16) NOT NULL DEFAULT 'slider';

  ALTER TABLE launch_settings
    ADD COLUMN IF NOT EXISTS background_video_url VARCHAR(500);

  ALTER TABLE launch_settings
    ADD COLUMN IF NOT EXISTS background_audio_url VARCHAR(500);

  ALTER TABLE launch_settings
    ADD COLUMN IF NOT EXISTS background_slider_images JSONB NOT NULL DEFAULT '[]'::jsonb;

  UPDATE launch_settings
  SET
    upcoming_enabled = COALESCE(upcoming_enabled, true),
    logo_image_url = COALESCE(NULLIF(logo_image_url, ''), '/images/michale copy2.png'),
    background_mode = CASE
      WHEN background_mode IN ('video', 'slider') THEN background_mode
      ELSE 'slider'
    END,
    background_slider_images = CASE
      WHEN jsonb_typeof(background_slider_images) = 'array' THEN background_slider_images
      ELSE '[]'::jsonb
    END;

  INSERT INTO launch_settings (
    id,
    upcoming_enabled,
    base_count,
    tshirt_release_at,
    movie_release_at,
    logo_image_url,
    background_mode,
    background_slider_images
  )
  VALUES (
    1,
    true,
    0,
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '60 days',
    '/images/michale copy2.png',
    'slider',
    '[]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
`;

export interface UpcomingSnapshot {
  upcomingEnabled: boolean;
  baseCount: number;
  dbCount: number;
  totalCount: number;
  tshirtReleaseAt: string;
  movieReleaseAt: string;
  logoImageUrl: string;
  backgroundMode: 'video' | 'slider';
  backgroundVideoUrl: string | null;
  backgroundAudioUrl: string | null;
  backgroundSliderImages: string[];
}

export interface UpcomingSettingsInput {
  upcomingEnabled: boolean;
  baseCount: number;
  tshirtReleaseAt: string;
  movieReleaseAt: string;
  logoImageUrl: string;
  backgroundMode: 'video' | 'slider';
  backgroundVideoUrl: string | null;
  backgroundAudioUrl: string | null;
  backgroundSliderImages: string[];
}

export interface WaitingListEntry {
  id: number;
  phoneNumber: string;
  createdAt: string;
}

function normalizeSliderImages(value: unknown): string[] {
  let parsed: unknown = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const cleaned = parsed
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return cleaned;
}

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const safeBase = base
    .replace(/\s+/g, '-')
    .replace(/[#?&=%]/g, '')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeBase || 'file'}${ext.toLowerCase()}`;
}

export async function saveUpcomingMedia(file: File, category: 'logo' | 'background' | 'audio'): Promise<string> {
  const safeName = `${Date.now()}-${sanitizeFilename(file.name)}`;
  const subFolder = category === 'logo' ? 'logo' : category === 'audio' ? 'audio' : 'background';
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'upcoming', subFolder);

  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return `/uploads/upcoming/${subFolder}/${safeName}`;
}

export async function ensureUpcomingTables(): Promise<void> {
  await db.query(CREATE_UPCOMING_TABLES_SQL);
}

export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  const hasPlusPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlusPrefix ? `+${digits}` : digits;
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\+?\d{7,15}$/.test(phone);
}

export async function getUpcomingSnapshot(): Promise<UpcomingSnapshot> {
  await ensureUpcomingTables();

  const result = await db.query(
    `SELECT
      s.upcoming_enabled,
      s.base_count,
      s.tshirt_release_at,
      s.movie_release_at,
      s.logo_image_url,
      s.background_mode,
      s.background_video_url,
      s.background_audio_url,
      s.background_slider_images,
      (SELECT COUNT(*)::INT FROM waiting_list_entries) AS db_count
    FROM launch_settings s
    WHERE s.id = 1`
  );

  const row = result.rows[0];
  const baseCount = Number(row?.base_count ?? 0);
  const dbCount = Number(row?.db_count ?? 0);
  const backgroundMode = row?.background_mode === 'video' ? 'video' : 'slider';
  const backgroundSliderImages = normalizeSliderImages(row?.background_slider_images);

  return {
    upcomingEnabled: row?.upcoming_enabled !== false,
    baseCount,
    dbCount,
    totalCount: baseCount + dbCount,
    tshirtReleaseAt: new Date(row.tshirt_release_at).toISOString(),
    movieReleaseAt: new Date(row.movie_release_at).toISOString(),
    logoImageUrl: row?.logo_image_url || '/images/michale copy2.png',
    backgroundMode,
    backgroundVideoUrl: row?.background_video_url || null,
    backgroundAudioUrl: row?.background_audio_url || null,
    backgroundSliderImages,
  };
}

export async function joinWaitingList(phoneNumber: string): Promise<{ joined: boolean; snapshot: UpcomingSnapshot }> {
  await ensureUpcomingTables();

  const result = await db.query(
    `INSERT INTO waiting_list_entries (phone_number)
     VALUES ($1)
     ON CONFLICT (phone_number) DO NOTHING
     RETURNING id`,
    [phoneNumber]
  );

  const snapshot = await getUpcomingSnapshot();
  return {
    joined: (result.rowCount ?? 0) > 0,
    snapshot,
  };
}

export async function getWaitingListEntries(): Promise<WaitingListEntry[]> {
  await ensureUpcomingTables();

  const result = await db.query(
    `SELECT id, phone_number, created_at
     FROM waiting_list_entries
     ORDER BY created_at DESC`
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    phoneNumber: String(row.phone_number),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function clearWaitingListEntries(): Promise<void> {
  await ensureUpcomingTables();
  await db.query('TRUNCATE TABLE waiting_list_entries RESTART IDENTITY');
}

export async function resetUpcomingSettings(): Promise<void> {
  await ensureUpcomingTables();

  await db.query(
    `UPDATE launch_settings
     SET base_count = 0,
       upcoming_enabled = true,
         tshirt_release_at = NOW() + INTERVAL '30 days',
         movie_release_at = NOW() + INTERVAL '60 days',
         logo_image_url = '/images/michale copy2.png',
         background_mode = 'slider',
         background_video_url = NULL,
         background_audio_url = NULL,
         background_slider_images = '[]'::jsonb,
         updated_at = NOW()
     WHERE id = 1`
  );
}

export async function updateUpcomingSettings(input: UpcomingSettingsInput): Promise<void> {
  await ensureUpcomingTables();

  const backgroundSliderImages = normalizeSliderImages(input.backgroundSliderImages);

  await db.query(
    `UPDATE launch_settings
     SET upcoming_enabled = $1,
         base_count = $2,
         tshirt_release_at = $3,
         movie_release_at = $4,
         logo_image_url = $5,
         background_mode = $6,
         background_video_url = $7,
         background_audio_url = $8,
         background_slider_images = $9::jsonb,
         updated_at = NOW()
     WHERE id = 1`,
    [
      input.upcomingEnabled,
      input.baseCount,
      input.tshirtReleaseAt,
      input.movieReleaseAt,
      input.logoImageUrl,
      input.backgroundMode,
      input.backgroundVideoUrl,
      input.backgroundAudioUrl,
      JSON.stringify(backgroundSliderImages),
    ]
  );
}
