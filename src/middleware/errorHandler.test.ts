import { errorHandler, notFoundHandler } from "./errorHandler.js";
import AppError from "../errors/AppError.js";
import { ValidationError } from "../errors/ValidationErrors.js";
import type { NextFunction, Request, Response } from "express";

// A generic example error carrying array-shaped `details`, to exercise
// that half of AppError.toApiError() without depending on a real domain
// error's exact code.
class TestErrorWithDetails extends AppError {
  readonly statusCode = 422;
  readonly code = "TEST_ERROR_WITH_DETAILS";
}

interface MockResponse {
  headersSent: boolean;
  status: jest.Mock;
  json: jest.Mock;
}

// Kept as MockResponse (plain jest.Mock methods), not Response, at every
// call site that reads it back with expect(...) -- Response's own method
// types lack `this: void`, which trips @typescript-eslint/unbound-method
// the moment a bare method reference (not a call) is passed to expect().
// Only cast to Response at the one call boundary that needs it: passing
// the mock into the real handler under test.
function mockResponse(): MockResponse {
  return {
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function asResponse(res: MockResponse): Response {
  return res as unknown as Response;
}

describe("notFoundHandler", () => {
  it("responds with a ROUTE_NOT_FOUND ApiError", () => {
    const res = mockResponse();

    notFoundHandler({} as Request, asResponse(res));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: "ROUTE_NOT_FOUND", status: 404, message: "Route not found." },
    });
  });
});

describe("errorHandler", () => {
  it("routes an AppError's array-shaped details onto ApiError.details via toApiError()", () => {
    const res = mockResponse();
    const error = new TestErrorWithDetails("Bad template.", ["Must define a subject."]);

    errorHandler(error, {} as Request, asResponse(res), jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "TEST_ERROR_WITH_DETAILS",
        status: 422,
        message: "Bad template.",
        details: ["Must define a subject."],
      },
    });
  });

  it("routes a ValidationError's field-keyed errors onto ApiError.fieldErrors via toApiError()", () => {
    const res = mockResponse();
    const error = new ValidationError({ "to.0.email": "Invalid email format." });

    errorHandler(error, {} as Request, asResponse(res), jest.fn());

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        status: 400,
        message: "The request is invalid.",
        fieldErrors: { "to.0.email": "Invalid email format." },
      },
    });
  });

  it("passes through to next() once headers are already sent", () => {
    const res = { headersSent: true } as Response;
    const next = jest.fn() as NextFunction;
    const error = new Error("boom");

    errorHandler(error, {} as Request, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("maps a JSON body-parse failure to a 400 INVALID_JSON response", () => {
    const res = mockResponse();
    const error = Object.assign(new Error("parse failed"), {
      type: "entity.parse.failed",
    });

    errorHandler(error, {} as Request, asResponse(res), jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INVALID_JSON",
        status: 400,
        message: "The request body contains invalid JSON.",
      },
    });
  });

  it("maps an oversized body to a 413 PAYLOAD_TOO_LARGE response", () => {
    const res = mockResponse();
    const error = Object.assign(new Error("too large"), { type: "entity.too.large" });

    errorHandler(error, {} as Request, asResponse(res), jest.fn());

    expect(res.status).toHaveBeenCalledWith(413);
  });

  it("falls back to a 500 INTERNAL_SERVER_ERROR for anything unrecognized", () => {
    const res = mockResponse();
    const logError = jest.fn();
    const req = {
      method: "GET",
      originalUrl: "/x",
      log: { error: logError },
    } as unknown as Request;
    const error = new Error("unexpected");

    errorHandler(error, req, asResponse(res), jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        status: 500,
        message: "An unexpected error occurred.",
      },
    });
    expect(logError).toHaveBeenCalledWith(
      { method: "GET", path: "/x", err: error },
      "unhandled request error",
    );
  });
});
