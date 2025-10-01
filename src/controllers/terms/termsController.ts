import { Request, Response } from 'express';
import { TERMS_AND_CONDITIONS } from '../../config/terms/termsAndConditions';

export const getTermsAndConditions = (req: Request, res: Response) => {
  try {
    return res.status(200).json({ termsAndConditions: TERMS_AND_CONDITIONS });
  } catch (error) {
    console.error('Error fetching terms and conditions:', error);
    return res
      .status(500)
      .json({ message: 'Failed to retrieve terms and conditions.' });
  }
};
