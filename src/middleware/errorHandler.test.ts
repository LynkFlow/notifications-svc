import { errorHandler, notFoundHandler } from "./errorHandler.js";
import AppError from "../errors/AppError.js";
import type { NextFunction, Request, Response } from "express";

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
  it("routes an array-shaped AppError.details onto ApiError.details", () => {
    const res = mockResponse();
    const error = new AppError(422, "EMAIL_TEMPLATE_INVALID", "Bad template.", [
      "Must define a subject.",
    ]);

    errorHandler(error, {} as Request, asResponse(res), jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "EMAIL_TEMPLATE_INVALID",
        status: 422,
        message: "Bad template.",
        details: ["Must define a subject."],
      },
    });
  });

  it("routes a field-keyed AppError.details onto ApiError.fieldErrors", () => {
    const res = mockResponse();
    const error = new AppError(400, "VALIDATION_ERROR", "The request is invalid.", {
      "to.0.email": "Invalid email format.",
    });

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
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    errorHandler(
      new Error("unexpected"),
      { method: "GET", originalUrl: "/x" } as Request,
      asResponse(res),
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        status: 500,
        message: "An unexpected error occurred.",
      },
    });
    consoleError.mockRestore();
  });
});
