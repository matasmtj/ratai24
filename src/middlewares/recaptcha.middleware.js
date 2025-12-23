import { badRequest } from '../errors.js';

export async function verifyRecaptcha(req, res, next) {
  try {
    const { recaptchaToken } = req.body;
    
    if (!recaptchaToken) {
      throw badRequest('reCAPTCHA token is required');
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    });

    const data = await response.json();

    // For reCAPTCHA v2 checkbox - only check success
    if (!data.success) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed. Please complete the challenge.' });
    }

    next();
  } catch (e) {
    next(e);
  }
}
