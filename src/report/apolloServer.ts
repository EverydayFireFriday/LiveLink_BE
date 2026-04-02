// src/report/apolloServer.ts
import { ApolloServer } from 'apollo-server-express';
import express, { Request, Response } from 'express';
import { Server } from 'http';
import { GraphQLResolveInfo } from 'graphql';
import { reportTypeDefs } from './reportTypeDefs';
import { reportResolvers } from './reportResolvers';
import { ReportService } from './reportService';
import logger from '../utils/logger/logger';

// GraphQL Context interface
interface GraphQLContext {
  req: Request;
  res: Response;
  reportService: ReportService;
}

// Apollo Server resolvers interface
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
  httpServer: Server,
  reportService: ReportService,
) => {
  const server = new ApolloServer({
    typeDefs: reportTypeDefs,
    resolvers: reportResolvers(reportService) as ApolloResolvers,
    context: ({
      req,
      res,
    }: {
      req: Request;
      res: Response;
    }): GraphQLContext => ({
      req,
      res,
      reportService,
    }),
    introspection: process.env.NODE_ENV !== 'production',
    cache: 'bounded', // DoS 공격 방지를 위한 제한된 캐시 사용
  });

  await server.start();

  // XS-Search (CSRF) mitigation: block Content-Type: message/* headers on GraphQL endpoint
  // Workaround for GHSA-xxx apollo-server-core <= 3.13.0 (no patch available for v3)
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

  // Type assertion needed due to @types/express version mismatch in apollo-server-express
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.applyMiddleware as (config: { app: any; path: string }) => void)({
    app,
    path: '/graphql',
  });

  logger.info('✅ Apollo Server initialized at /graphql');
};
