import {
  type ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter.js';
import { ProblemException } from './problem-details.js';

interface FakeResponse {
  headersSent: boolean;
  headers: Record<string, string>;
  statusCode?: number;
  contentType?: string;
  body?: unknown;
  setHeader(name: string, value: string): void;
  status(code: number): FakeResponse;
  type(value: string): FakeResponse;
  send(body: string): FakeResponse;
}

function fakeResponse(headersSent = false): FakeResponse {
  const response: FakeResponse = {
    headersSent,
    headers: {},
    setHeader(name, value) {
      response.headers[name] = value;
    },
    status(code) {
      response.statusCode = code;
      return response;
    },
    type(value) {
      response.contentType = value;
      return response;
    },
    send(body) {
      response.body = JSON.parse(body);
      return response;
    },
  };
  return response;
}

function hostFor(response: FakeResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
}

describe('ProblemDetailsFilter', () => {
  const filter = new ProblemDetailsFilter();
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorLog = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function render(exception: unknown): FakeResponse {
    const response = fakeResponse();
    filter.catch(exception, hostFor(response));
    return response;
  }

  it('sends a ProblemException as built, with its headers', () => {
    const response = render(
      new ProblemException(HttpStatus.CONFLICT, {
        detail: 'Already exists.',
        code: 'conflict_code',
        errors: [{ path: 'name', message: 'Taken' }],
        headers: { 'Retry-After': '5' },
      }),
    );

    expect(response.statusCode).toBe(409);
    expect(response.contentType).toBe('application/problem+json');
    expect(response.headers).toEqual({ 'Retry-After': '5' });
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'Already exists.',
      code: 'conflict_code',
      errors: [{ path: 'name', message: 'Taken' }],
    });
  });

  it('maps framework 404s and 403s to generic client-safe details', () => {
    expect(
      render(new NotFoundException('Cannot GET /secret/path')).body,
    ).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource was not found.',
    });
    expect(
      render(new ForbiddenException('Forbidden resource')).body,
    ).toMatchObject({
      status: 403,
      detail: 'You do not have permission to perform this action.',
    });
  });

  it('reports malformed JSON bodies as 400', () => {
    const parseError = Object.assign(
      new SyntaxError('Unexpected token } in JSON'),
      {
        status: 400,
        type: 'entity.parse.failed',
      },
    );

    expect(render(parseError).body).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request body is not valid JSON.',
    });
  });

  it('replaces framework 400 messages, which can echo the input', () => {
    const response = render(
      new BadRequestException('Unexpected token s in JSON at position 2'),
    );

    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request is malformed.',
    });
  });

  it('hides unexpected errors behind a generic 500 and logs them', () => {
    const response = render(new Error('connection to db.internal:5432 failed'));

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
    });
    expect(JSON.stringify(response.body)).not.toContain('db.internal');
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the response has already been sent', () => {
    const response = fakeResponse(true);

    filter.catch(new Error('late'), hostFor(response));

    expect(response.statusCode).toBeUndefined();
  });
});
