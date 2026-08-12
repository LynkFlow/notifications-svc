import AppError from "../errors/AppError";
import { databaseIsReachable } from "../repositories/healthRepository";

export interface HealthStatus {
    status: "ok";
    timestamp: string;
}

function healthy(): HealthStatus {
    return {
        status: "ok",
        timestamp: new Date().toISOString(),
    };
}

export function getLiveness(): HealthStatus {
    return healthy();
}

export async function getReadiness(): Promise<HealthStatus> {
    try {
        if (await databaseIsReachable()) {
            return healthy();
        }
    } catch {
        // The public response intentionally omits infrastructure details.
    }

    throw new AppError(
        503,
        "SERVICE_NOT_READY",
        "The service is not ready to accept traffic.",
    );
}

