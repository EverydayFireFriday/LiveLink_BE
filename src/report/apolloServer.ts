// src/report/apolloServer.ts

import { ApolloServer } from 'apollo-server-express';
import { Express } from 'express';
import { Server } from 'http';
import { reportTypeDefs } from './reportTypeDefs';
import { reportResolvers } from './reportResolvers';
import { ReportService } from './reportService';
import logger from '../utils/logger/logger';

export const setupApolloServer = async (
  app: Express,
  httpServer: Server,
  reportService: ReportService,
) => {
  const server = new ApolloServer({
    typeDefs: reportTypeDefs,
    resolvers: reportResolvers(reportService), // Pass reportService to resolvers
    context: ({ req, res }) => ({ req, res, reportService }), // Make reportService available in context
  });

  await server.start();
  server.applyMiddleware({ app: app as any, path: '/graphql' });

  logger.info('✅ Apollo Server initialized at /graphql');
};
