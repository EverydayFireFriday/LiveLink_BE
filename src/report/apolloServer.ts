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
  });

  await server.start();
  // Type assertion needed due to @types/express version mismatch in apollo-server-express
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.applyMiddleware as (config: { app: any; path: string }) => void)({
    app,
    path: '/graphql',
  });

  logger.info('✅ Apollo Server initialized at /graphql');
};
