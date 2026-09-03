import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express, { Request, Response } from 'express';
import { Server } from 'http';
import { GraphQLResolveInfo } from 'graphql';
import { reportTypeDefs } from './reportTypeDefs';
import { reportResolvers } from './reportResolvers';
import { ReportService } from './reportService';
import logger from '../utils/logger/logger';

interface GraphQLContext {
  req: Request;
  res: Response;
  reportService: ReportService;
}

interface ApolloResolvers {
  [key: string]: {
    [key: string]: (
      parent: unknown,
      args: Record<string, unknown>,
      context: GraphQLContext,
      info: GraphQLResolveInfo,
    ) => unknown;
  };
}

export const setupApolloServer = async (
  app: express.Application,
  _httpServer: Server,
  reportService: ReportService,
) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const server = new ApolloServer<GraphQLContext>({
    typeDefs: reportTypeDefs,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    resolvers: reportResolvers(reportService) as ApolloResolvers,
    introspection: process.env.NODE_ENV !== 'production',
  });

  await server.start();

  // XS-Search (CSRF) mitigation: block Content-Type: message/* headers on GraphQL endpoint
  app.use(
    '/graphql',
    (req: Request, res: Response, next: express.NextFunction) => {
      for (let i = 0; i < req.rawHeaders.length - 1; i += 2) {
        if (
          req.rawHeaders[i].toLowerCase() === 'content-type' &&
          req.rawHeaders[i + 1].includes('message/')
        ) {
          res.status(415).json({ error: 'Content-Type not allowed' });
          return;
        }
      }
      next();
    },
  );

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: ({ req, res }) => Promise.resolve({ req, res, reportService }),
    }),
  );

  logger.info('✅ Apollo Server initialized at /graphql');
};
