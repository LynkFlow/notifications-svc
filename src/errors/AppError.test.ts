import AppError from "./AppError.js";

// AppError is abstract -- tested through a small concrete subclass, the
// same way a real error (ValidationError, ServiceNotReadyError, ...) would be.
class TestError extends AppError {
  readonly statusCode = 400;
  readonly code = "TEST_ERROR";
}

describe("AppError", () => {
  it("carries status, code, message, and array details, and sets name to the subclass", () => {
    const error = new TestError("The request is invalid.", ["Must define a subject."]);

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("TEST_ERROR");
    expect(error.message).toBe("The request is invalid.");
    expect(error.details).toEqual(["Must define a subject."]);
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe("TestError");
  });

  it("leaves details and fieldErrors undefined when not provided", () => {
    const error = new TestError("Oops.");

    expect(error.details).toBeUndefined();
    expect(error.fieldErrors).toBeUndefined();
  });

  it("carries field-keyed fieldErrors separately from details", () => {
    const error = new TestError("The request is invalid.", undefined, {
      email: "Invalid email format.",
    });

    expect(error.fieldErrors).toEqual({ email: "Invalid email format." });
  });

  describe("toApiError", () => {
    it("shapes a minimal ApiError with no details/fieldErrors keys when absent", () => {
      const error = new TestError("Oops.");

      expect(error.toApiError()).toEqual({
        code: "TEST_ERROR",
        status: 400,
        message: "Oops.",
      });
    });

    it("includes details when present", () => {
      const error = new TestError("Bad template.", ["Must define a subject."]);

      expect(error.toApiError()).toEqual({
        code: "TEST_ERROR",
        status: 400,
        message: "Bad template.",
        details: ["Must define a subject."],
      });
    });

    it("includes fieldErrors when present", () => {
      const error = new TestError("The request is invalid.", undefined, {
        email: "Invalid email format.",
      });

      expect(error.toApiError()).toEqual({
        code: "TEST_ERROR",
        status: 400,
        message: "The request is invalid.",
        fieldErrors: { email: "Invalid email format." },
      });
    });
  });
});
