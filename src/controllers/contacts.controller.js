import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';
import { cloudinary } from '../middlewares/upload.middleware.js';

// Helper functions
const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
};
const isValidPhone = (phone) => {
  // Basic phone validation: allow digits, spaces, +, -, (), min 7 chars
  const phoneRegex = /^[\d\s\+\-\(\)]{7,}$/;
  return typeof phone === 'string' && phoneRegex.test(phone.trim());
};
const isValidBusinessHours = (hours) => typeof hours === 'string' && hours.trim().length > 0;
const isOptionalString = (v) => v === undefined || v === null || typeof v === 'string';

function formatContactResponse(contact) {
  const operationAreasString = contact.operationAreas
    .map(area => area.city.name)
    .join(', ');

  return {
    id: contact.id,
    email: contact.email,
    phone: contact.phone,
    businessHoursWeekdays: contact.businessHoursWeekdays,
    businessHoursWeekend: contact.businessHoursWeekend,
    companyName: contact.companyName || '',
    companyCode: contact.companyCode || '',
    bankAccount: contact.bankAccount || '',
    companyEmail: contact.companyEmail || '',
    mainAddress: contact.mainAddress || '',
    heroImageUrl: contact.heroImageUrl || null,
    operationAreas: operationAreasString,
    operationAreasDetails: contact.operationAreas.map(area => ({
      id: area.id,
      cityId: area.cityId,
      cityName: area.city.name,
      country: area.city.country,
      address: area.address || ''
    })),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  };
}

// GET /contacts - Public endpoint
// Returns the first (and should be only) contact with all operation areas
export const getContact = async (req, res, next) => {
  try {
    const contact = await prisma.contact.findFirst({
      include: {
        operationAreas: {
          include: {
            city: {
              select: {
                id: true,
                name: true,
                country: true
              }
            }
          },
          orderBy: {
            cityId: 'asc'
          }
        }
      }
    });

    if (!contact) {
      throw notFound('Contact not found');
    }

    res.json(formatContactResponse(contact));
  } catch (e) { 
    next(e); 
  }
};

// POST /contacts - Admin only
// Creates a new contact with operation areas
export const createContact = async (req, res, next) => {
  try {
    const {
      email,
      phone,
      operationAreas,
      businessHoursWeekdays = '8:00 - 18:00',
      businessHoursWeekend = '9:00 - 15:00',
      companyName,
      companyCode,
      bankAccount,
      companyEmail,
      mainAddress,
    } = req.body;

    // Validation
    if (!isValidEmail(email)) {
      throw badRequest('Invalid email format');
    }
    if (!isValidPhone(phone)) {
      throw badRequest('Invalid phone number format (min 7 characters, digits, spaces, +, -, (), allowed)');
    }
    if (!isValidBusinessHours(businessHoursWeekdays)) {
      throw badRequest('businessHoursWeekdays must be a non-empty string');
    }
    if (!isValidBusinessHours(businessHoursWeekend)) {
      throw badRequest('businessHoursWeekend must be a non-empty string');
    }
    if (!Array.isArray(operationAreas) || operationAreas.length === 0) {
      throw badRequest('operationAreas must be a non-empty array');
    }
    if (!isOptionalString(companyName)) throw badRequest('companyName must be a string');
    if (!isOptionalString(companyCode)) throw badRequest('companyCode must be a string');
    if (!isOptionalString(bankAccount)) throw badRequest('bankAccount must be a string');
    if (!isOptionalString(companyEmail)) throw badRequest('companyEmail must be a string');
    if (!isOptionalString(mainAddress)) throw badRequest('mainAddress must be a string');
    if (companyEmail && companyEmail.trim() && !isValidEmail(companyEmail)) {
      throw badRequest('Invalid companyEmail format');
    }

    // Validate operation areas structure
    for (const area of operationAreas) {
      if (!Number.isInteger(area.cityId)) {
        throw badRequest('Each operation area must have a valid cityId');
      }
      if (area.address !== undefined && area.address !== null && typeof area.address !== 'string') {
        throw badRequest('Address must be a string or null/undefined');
      }
    }

    // Check if contact already exists
    const existing = await prisma.contact.findFirst();
    if (existing) {
      throw badRequest('Contact already exists. Use PUT to update.');
    }

    // Verify all cities exist
    const cityIds = operationAreas.map(area => area.cityId);
    const cities = await prisma.city.findMany({
      where: { id: { in: cityIds } }
    });
    if (cities.length !== cityIds.length) {
      throw badRequest('Some cities do not exist');
    }

    // Create contact with operation areas
    const contact = await prisma.contact.create({
      data: {
        email: email.trim(),
        phone: phone.trim(),
        businessHoursWeekdays: businessHoursWeekdays.trim(),
        businessHoursWeekend: businessHoursWeekend.trim(),
        companyName: companyName?.trim() || null,
        companyCode: companyCode?.trim() || null,
        bankAccount: bankAccount?.trim() || null,
        companyEmail: companyEmail?.trim() || null,
        mainAddress: mainAddress?.trim() || null,
        operationAreas: {
          create: operationAreas.map(area => ({
            cityId: area.cityId,
            address: area.address ? area.address.trim() : null
          }))
        }
      },
      include: {
        operationAreas: {
          include: {
            city: {
              select: {
                id: true,
                name: true,
                country: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(formatContactResponse(contact));
  } catch (e) { 
    next(e); 
  }
};

// PUT /contacts - Admin only
// Updates the existing contact (assumes there's only one)
export const updateContact = async (req, res, next) => {
  try {
    const {
      email, phone, operationAreas, businessHoursWeekdays, businessHoursWeekend,
      companyName, companyCode, bankAccount, companyEmail, mainAddress,
    } = req.body;

    // Validation
    if (email !== undefined && !isValidEmail(email)) {
      throw badRequest('Invalid email format');
    }
    if (phone !== undefined && !isValidPhone(phone)) {
      throw badRequest('Invalid phone number format (min 7 characters, digits, spaces, +, -, (), allowed)');
    }
    if (businessHoursWeekdays !== undefined && !isValidBusinessHours(businessHoursWeekdays)) {
      throw badRequest('businessHoursWeekdays must be a non-empty string');
    }
    if (businessHoursWeekend !== undefined && !isValidBusinessHours(businessHoursWeekend)) {
      throw badRequest('businessHoursWeekend must be a non-empty string');
    }
    if (!isOptionalString(companyName)) throw badRequest('companyName must be a string');
    if (!isOptionalString(companyCode)) throw badRequest('companyCode must be a string');
    if (!isOptionalString(bankAccount)) throw badRequest('bankAccount must be a string');
    if (!isOptionalString(companyEmail)) throw badRequest('companyEmail must be a string');
    if (!isOptionalString(mainAddress)) throw badRequest('mainAddress must be a string');
    if (companyEmail !== undefined && companyEmail?.trim() && !isValidEmail(companyEmail)) {
      throw badRequest('Invalid companyEmail format');
    }
    if (operationAreas !== undefined) {
      if (!Array.isArray(operationAreas)) {
        throw badRequest('operationAreas must be an array');
      }
      
      // Validate operation areas structure
      for (const area of operationAreas) {
        if (!Number.isInteger(area.cityId)) {
          throw badRequest('Each operation area must have a valid cityId');
        }
        if (area.address !== undefined && area.address !== null && typeof area.address !== 'string') {
          throw badRequest('Address must be a string or null/undefined');
        }
      }
    }

    // Find the contact (should be only one)
    const existing = await prisma.contact.findFirst();
    if (!existing) {
      throw notFound('Contact not found. Use POST to create.');
    }

    // Verify all cities exist if operationAreas is provided
    if (operationAreas) {
      const cityIds = operationAreas.map(area => area.cityId);
      const cities = await prisma.city.findMany({
        where: { id: { in: cityIds } }
      });
      if (cities.length !== cityIds.length) {
        throw badRequest('Some cities do not exist');
      }
    }

    // Build update data
    const updateData = {};
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (businessHoursWeekdays !== undefined) updateData.businessHoursWeekdays = businessHoursWeekdays.trim();
    if (businessHoursWeekend !== undefined) updateData.businessHoursWeekend = businessHoursWeekend.trim();
    if (companyName !== undefined) updateData.companyName = companyName?.trim() || null;
    if (companyCode !== undefined) updateData.companyCode = companyCode?.trim() || null;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount?.trim() || null;
    if (companyEmail !== undefined) updateData.companyEmail = companyEmail?.trim() || null;
    if (mainAddress !== undefined) updateData.mainAddress = mainAddress?.trim() || null;

    // If operationAreas is provided, delete old ones and create new ones
    if (operationAreas !== undefined) {
      // Delete existing operation areas
      await prisma.contactOperationArea.deleteMany({
        where: { contactId: existing.id }
      });

      // Create new operation areas
      updateData.operationAreas = {
        create: operationAreas.map(area => ({
          cityId: area.cityId,
          address: area.address ? area.address.trim() : null
        }))
      };
    }

    // Update contact
    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        operationAreas: {
          include: {
            city: {
              select: {
                id: true,
                name: true,
                country: true
              }
            }
          },
          orderBy: {
            cityId: 'asc'
          }
        }
      }
    });

    res.json(formatContactResponse(contact));
  } catch (e) { 
    next(e); 
  }
};

/**
 * Extract a Cloudinary publicId (with folder) from an upload URL.
 * Mirrors the logic used in car-images.controller.js when deleting assets.
 */
function publicIdFromCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const parts = url.split('/');
  const uploadIdx = parts.findIndex((p) => p === 'upload');
  if (uploadIdx === -1) return null;
  // Skip 'upload' and the version segment (e.g. v1234567890).
  const pathParts = parts.slice(uploadIdx + 2);
  const joined = pathParts.join('/');
  const dot = joined.lastIndexOf('.');
  return dot === -1 ? joined : joined.substring(0, dot);
}

// POST /contacts/hero-image - Admin uploads the landing hero background image.
// Expects a single file in the `image` field (multipart/form-data).
export const uploadHeroImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw badRequest('No file uploaded. Send the image in the "image" field.');
    }

    const existing = await prisma.contact.findFirst();
    if (!existing) {
      throw notFound('Contact not found. Create contact details first.');
    }

    // If a previous hero image exists, remove it from Cloudinary first.
    if (existing.heroImageUrl) {
      const publicId = publicIdFromCloudinaryUrl(existing.heroImageUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Failed to delete previous hero image from Cloudinary:', err);
        }
      }
    }

    const updated = await prisma.contact.update({
      where: { id: existing.id },
      data: { heroImageUrl: req.file.path },
      include: {
        operationAreas: {
          include: {
            city: { select: { id: true, name: true, country: true } },
          },
          orderBy: { cityId: 'asc' },
        },
      },
    });

    res.status(201).json(formatContactResponse(updated));
  } catch (e) {
    next(e);
  }
};

// DELETE /contacts/hero-image - Admin removes the hero image; falls back to gradient.
export const deleteHeroImage = async (req, res, next) => {
  try {
    const existing = await prisma.contact.findFirst();
    if (!existing) {
      throw notFound('Contact not found.');
    }

    if (existing.heroImageUrl) {
      const publicId = publicIdFromCloudinaryUrl(existing.heroImageUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Failed to delete hero image from Cloudinary:', err);
        }
      }
    }

    const updated = await prisma.contact.update({
      where: { id: existing.id },
      data: { heroImageUrl: null },
      include: {
        operationAreas: {
          include: {
            city: { select: { id: true, name: true, country: true } },
          },
          orderBy: { cityId: 'asc' },
        },
      },
    });

    res.json(formatContactResponse(updated));
  } catch (e) {
    next(e);
  }
};
