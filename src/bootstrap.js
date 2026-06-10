import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import prisma from './models/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const legalDefaultsPath = join(__dirname, '../prisma/data/legal-page-defaults.json');

function loadLegalDefaults() {
  try {
    return JSON.parse(readFileSync(legalDefaultsPath, 'utf8'));
  } catch (e) {
    console.warn('[bootstrap] legal-page-defaults.json not found, skipping legal seed');
    return null;
  }
}

async function ensureContact() {
  const existing = await prisma.contact.findFirst();
  if (existing) return;

  const vilnius = await prisma.city.findFirst({ where: { name: 'Vilnius' } });
  const kaunas = await prisma.city.findFirst({ where: { name: 'Kaunas' } });
  const cityIds = [vilnius?.id, kaunas?.id].filter(Boolean);

  await prisma.contact.create({
    data: {
      email: 'info@ratai24.lt',
      phone: '+370 600 00000',
      businessHoursWeekdays: '8:00 - 18:00',
      businessHoursWeekend: '9:00 - 15:00',
      companyName: 'Ratai24',
      companyEmail: 'info@ratai24.lt',
      mainAddress: 'Vilnius, Lietuva',
      operationAreas: cityIds.length
        ? {
            create: cityIds.map((cityId) => ({ cityId })),
          }
        : undefined,
    },
  });
  console.log('[bootstrap] Created default contact');
}

async function ensureLegalPages() {
  const defaults = loadLegalDefaults();
  if (!defaults) return;

  let created = 0;
  for (const pageKey of Object.keys(defaults)) {
    const byLang = defaults[pageKey];
    for (const language of Object.keys(byLang)) {
      const existing = await prisma.legalPageContent.findUnique({
        where: { pageKey_language: { pageKey, language } },
      });
      if (existing) continue;

      await prisma.legalPageContent.create({
        data: {
          pageKey,
          language,
          content: byLang[language],
        },
      });
      created++;
    }
  }
  if (created > 0) {
    console.log(`[bootstrap] Seeded ${created} legal page language(s)`);
  }
}

export async function runBootstrap() {
  try {
    await ensureContact();
    await ensureLegalPages();
  } catch (e) {
    console.error('[bootstrap] Failed:', e.message);
  }
}
