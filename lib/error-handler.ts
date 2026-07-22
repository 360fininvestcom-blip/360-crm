/**
 * Centralized Error Handler
 * 
 * Provides consistent error handling across the application.
 */

import { Prisma } from "@prisma/client";
import { ValidationError } from "./validations/schemas";

export type AppError = {
    message: string;
    code?: string;
    status: number;
    details?: string;
};

/**
 * Convert any error to a standardized AppError format
 */
export function handleError(error: unknown): AppError {
    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return {
            message: error.message,
            code: error.code,
            status: getStatusFromPrismaCode(error.code),
            details: error.meta ? JSON.stringify(error.meta) : undefined,
        };
    }

    // Validation errors
    if (error instanceof ValidationError) {
        return {
            message: error.message,
            code: "VALIDATION_ERROR",
            status: 400,
        };
    }

    // Standard Error objects
    if (error instanceof Error) {
        return {
            message: error.message,
            code: "INTERNAL_ERROR",
            status: 500,
        };
    }

    // Unknown errors
    return {
        message: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
        status: 500,
    };
}

/**
 * Map Prisma error codes to HTTP status codes
 */
function getStatusFromPrismaCode(code: string): number {
    const codeMap: Record<string, number> = {
        "P2002": 409, // Unique constraint failed
        "P2003": 400, // Foreign key constraint failed
        "P2025": 404, // Record not found
    };
    return codeMap[code] || 500;
}

/**
 * Create a JSON error response for API routes
 */
export function errorResponse(error: unknown): Response {
    const appError = handleError(error);
    return Response.json(
        {
            error: appError.message,
            code: appError.code,
            details: appError.details,
        },
        { status: appError.status }
    );
}

/**
 * Log error to console (and future monitoring service)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
    const appError = handleError(error);

    console.error("[ERROR]", {
        ...appError,
        context,
        timestamp: new Date().toISOString(),
    });

    // TODO: Send to Sentry or other monitoring service
    // if (typeof window === 'undefined') {
    //     Sentry.captureException(error, { extra: context });
    // }
}
