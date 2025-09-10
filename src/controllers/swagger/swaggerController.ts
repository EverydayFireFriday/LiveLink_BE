import express from 'express';
import { swaggerSpec } from '../../config/swagger';

export const getSwaggerJson = (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};
