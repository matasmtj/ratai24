import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';

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

    // Format response for frontend
    // Frontend expects operationAreas as comma-separated string for backward compatibility
    // But we also provide the structured data
    const operationAreasString = contact.operationAreas
      .map(area => area.city.name)
      .join(', ');

    const response = {
      id: contact.id,
      email: contact.email,
      phone: contact.phone,
      operationAreas: operationAreasString, // Comma-separated for frontend compatibility
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

    res.json(response);
  } catch (e) { 
    next(e); 
  }
};

// POST /contacts - Admin only
// Creates a new contact with operation areas
export const createContact = async (req, res, next) => {
  try {
    const { email, phone, operationAreas } = req.body;

    // Validation
    if (!isValidEmail(email)) {
      throw badRequest('Invalid email format');
    }
    if (!isValidPhone(phone)) {
      throw badRequest('Invalid phone number format (min 7 characters, digits, spaces, +, -, (), allowed)');
    }
    if (!Array.isArray(operationAreas) || operationAreas.length === 0) {
      throw badRequest('operationAreas must be a non-empty array');
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

    // Format response
    const operationAreasString = contact.operationAreas
      .map(area => area.city.name)
      .join(', ');

    const response = {
      id: contact.id,
      email: contact.email,
      phone: contact.phone,
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

    res.status(201).json(response);
  } catch (e) { 
    next(e); 
  }
};

// PUT /contacts - Admin only
// Updates the existing contact (assumes there's only one)
export const updateContact = async (req, res, next) => {
  try {
    const { email, phone, operationAreas } = req.body;

    // Validation
    if (email !== undefined && !isValidEmail(email)) {
      throw badRequest('Invalid email format');
    }
    if (phone !== undefined && !isValidPhone(phone)) {
      throw badRequest('Invalid phone number format (min 7 characters, digits, spaces, +, -, (), allowed)');
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

    // Format response
    const operationAreasString = contact.operationAreas
      .map(area => area.city.name)
      .join(', ');

    const response = {
      id: contact.id,
      email: contact.email,
      phone: contact.phone,
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

    res.json(response);
  } catch (e) { 
    next(e); 
  }
};
