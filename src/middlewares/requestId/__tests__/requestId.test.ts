import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requestIdMiddleware } from '../requestId';

// uuid v14는 ESM 전용이라 jest(CommonJS)에서 직접 로드할 수 없어 mock 처리
jest.mock('uuid', () => ({ v4: jest.fn() }));

const mockedUuid = uuidv4 as unknown as jest.Mock;

const createMocks = (headers: Record<string, string> = {}) => {
  const req = { headers } as unknown as Request;
  const res = { setHeader: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
};

describe('requestIdMiddleware', () => {
  beforeEach(() => {
    mockedUuid.mockReset();
    mockedUuid.mockReturnValue('generated-uuid');
  });

  it('should generate an id when no X-Request-ID header is given', () => {
    const { req, res, next } = createMocks();

    requestIdMiddleware(req, res, next);

    expect(req.id).toBe('generated-uuid');
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      'generated-uuid',
    );
  });

  it('should reuse the X-Request-ID header sent by the client', () => {
    const { req, res, next } = createMocks({ 'x-request-id': 'client-id-123' });

    requestIdMiddleware(req, res, next);

    expect(req.id).toBe('client-id-123');
    expect(mockedUuid).not.toHaveBeenCalled();
  });

  it('should set the X-Request-ID response header', () => {
    const { req, res, next } = createMocks({ 'x-request-id': 'abc' });

    requestIdMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'abc');
  });

  it('should call next exactly once', () => {
    const { req, res, next } = createMocks();

    requestIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should generate a different id for each request', () => {
    mockedUuid.mockReturnValueOnce('id-1').mockReturnValueOnce('id-2');
    const first = createMocks();
    const second = createMocks();

    requestIdMiddleware(first.req, first.res, first.next);
    requestIdMiddleware(second.req, second.res, second.next);

    expect(first.req.id).toBe('id-1');
    expect(second.req.id).toBe('id-2');
  });
});
