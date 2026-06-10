import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';

const VALID_PAGE_KEYS = ['privacy-policy', 'rental-terms'];
const VALID_LANGUAGES = ['lt', 'en', 'ru'];

function validateContent(content) {
  if (!content || typeof content !== 'object') {
    throw badRequest('content must be an object');
  }
  if (typeof content.intro !== 'string') {
    throw badRequest('content.intro must be a string');
  }
  if (!Array.isArray(content.sections)) {
    throw badRequest('content.sections must be an array');
  }
  for (const section of content.sections) {
    if (!section || typeof section.title !== 'string' || !section.title.trim()) {
      throw badRequest('Each section must have a title');
    }
    if (section.paragraphs !== undefined && !Array.isArray(section.paragraphs)) {
      throw badRequest('section.paragraphs must be an array');
    }
    if (section.bullets !== undefined && !Array.isArray(section.bullets)) {
      throw badRequest('section.bullets must be an array');
    }
  }
  if (content.note !== undefined && typeof content.note !== 'string') {
    throw badRequest('content.note must be a string');
  }
}

export const listLegalPages = async (req, res, next) => {
  try {
    const items = await prisma.legalPageContent.findMany({
      orderBy: [{ pageKey: 'asc' }, { language: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
};

export const getLegalPage = async (req, res, next) => {
  try {
    const { pageKey } = req.params;
    const language = req.query.lang || 'lt';

    if (!VALID_PAGE_KEYS.includes(pageKey)) throw badRequest('Invalid pageKey');
    if (!VALID_LANGUAGES.includes(language)) throw badRequest('Invalid language');

    const item = await prisma.legalPageContent.findUnique({
      where: { pageKey_language: { pageKey, language } },
    });
    if (!item) throw notFound('Legal page content not found');
    res.json(item);
  } catch (e) {
    next(e);
  }
};

export const upsertLegalPage = async (req, res, next) => {
  try {
    const { pageKey } = req.params;
    const { language, content } = req.body;

    if (!VALID_PAGE_KEYS.includes(pageKey)) throw badRequest('Invalid pageKey');
    if (!VALID_LANGUAGES.includes(language)) throw badRequest('Invalid language');
    validateContent(content);

    const item = await prisma.legalPageContent.upsert({
      where: { pageKey_language: { pageKey, language } },
      create: { pageKey, language, content },
      update: { content },
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
};
