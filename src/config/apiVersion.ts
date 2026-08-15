/**
 * One named constant every business route mount derives from --
 * see backend-conventions.md's "API versioning" section. /health is
 * never versioned; every other route mounts under /api/${API_VERSION}/....
 */
export const API_VERSION = "v1";
