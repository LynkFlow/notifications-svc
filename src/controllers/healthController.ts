import type { Request, Response } from "express";
import { getLiveness, getReadiness } from "../services/healthService";

export function liveness(_req: Request, res: Response): Response {
    return res.status(200).json({
        success: true,
        data: getLiveness(),
    });
}

export async function readiness(
    _req: Request,
    res: Response,
): Promise<Response> {
    return res.status(200).json({
        success: true,
        data: await getReadiness(),
    });
}

