import AppError from "./AppError.js";

describe("AppError", () => {
  it("carries status, code, message, and details", () => {
    const error = new AppError(400, "VALIDATION_ERROR", "The request is invalid.", {
      email: "Invalid email format.",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("The request is invalid.");
    expect(error.details).toEqual({ email: "Invalid email format." });
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe("AppError");
  });

  it("leaves details undefined when not provided", () => {
    const error = new AppError(500, "INTERNAL_SERVER_ERROR", "Oops.");

    expect(error.details).toBeUndefined();
  });
});
