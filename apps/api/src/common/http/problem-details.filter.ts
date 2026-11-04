import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  PROBLEM_CONTENT_TYPE,
  type ProblemDetails,
  ProblemException,
  statusTitle,
} from './problem-details.js';

/**
 * Turns every error into an RFC 9457 problem document.
 *
 * - `ProblemException`: sent as built (its detail is client-safe by contract).
 * - Other Nest `HttpException`s (router 404, guards, body parsing): status and
 *   title only, plus the framework's message for 4xx errors.
 * - Anything else: a generic 500. The error name and stack are logged on the
 *   server; nothing internal is sent to the client.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { problem, headers } = this.toProblem(exception);

    if (response.headersSent) {
      return;
    }
    for (const [name, value] of Object.entries(headers)) {
      response.setHeader(name, value);
    }
    response
      .status(problem.status)
      .type(PROBLEM_CONTENT_TYPE)
      .send(JSON.stringify(problem));
  }

  private toProblem(exception: unknown): {
    problem: ProblemDetails;
    headers: Readonly<Record<string, string>>;
  } {
    if (exception instanceof ProblemException) {
      return { problem: exception.problem, headers: exception.headers };
    }

    const status = httpStatusOf(exception);
    if (status !== undefined && status < 500) {
      return {
        problem: {
          type: 'about:blank',
          title: statusTitle(status),
          status,
          ...clientSafeDetail(exception, status),
        },
        headers: {},
      };
    }

    this.logger.error(
      `Unhandled ${errorName(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    const serverStatus = status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      problem: {
        type: 'about:blank',
        title: statusTitle(serverStatus),
        status: serverStatus,
      },
      headers: {},
    };
  }
}

/** Status of Nest HTTP exceptions and of body-parser errors (which carry `status`). */
function httpStatusOf(exception: unknown): number | undefined {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  if (exception instanceof Error) {
    const status = (exception as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return status;
    }
  }
  return undefined;
}

function clientSafeDetail(
  exception: unknown,
  status: number,
): { detail?: string } {
  if (isBodyParseError(exception)) {
    return { detail: 'The request body is not valid JSON.' };
  }
  // Nest maps body-parser SyntaxErrors (malformed JSON) and URIErrors to a
  // BadRequestException carrying the parser message, which can echo input.
  if (exception instanceof HttpException && status === 400) {
    return { detail: 'The request is malformed.' };
  }
  if (exception instanceof HttpException && status === 404) {
    return { detail: 'The requested resource was not found.' };
  }
  if (exception instanceof HttpException && status === 403) {
    return { detail: 'You do not have permission to perform this action.' };
  }
  // Multipart limits (multer) answer 413 with a framework message.
  if (exception instanceof HttpException && status === 413) {
    return { detail: 'The upload is too large.' };
  }
  return {};
}

function isBodyParseError(exception: unknown): boolean {
  return (
    exception instanceof Error &&
    (exception as { type?: unknown }).type === 'entity.parse.failed'
  );
}

function errorName(exception: unknown): string {
  return exception instanceof Error ? exception.name : typeof exception;
}
