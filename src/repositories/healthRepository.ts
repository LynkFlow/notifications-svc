import pool from "../db/pool";

export async function databaseIsReachable(): Promise<boolean> {
    const result = await pool.query<{ reachable: number }>(
        "SELECT 1 AS reachable",
    );
    return result.rows[0]?.reachable === 1;
}

