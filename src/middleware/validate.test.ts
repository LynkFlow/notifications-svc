import { z } from "zod";
import validate from "./validate.js";
import AppError from "../errors/AppError.js";
import type { NextFunction, Request, Response } from "express";

const schema = z.object({
  email: z.string().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

function mockNext(): NextFunction {
  return jest.fn();
}

describe("validate", () => {
  it("calls next() with no error and sets validatedBody on success", () => {
    const req = { body: { email: "a@b.com", password: "x" } } as Request;
    const next = mockNext();

    validate(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.validatedBody).toEqual({ email: "a@b.com", password: "x" });
  });

  it("calls next() with a field-keyed AppError on failure", () => {
    const req = { body: { email: "", password: "" } } as Request;
    const next = mockNext();

    validate(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.fieldErrors).toEqual({
      email: "Email is required.",
      password: "Password is required.",
    });
  });
});
