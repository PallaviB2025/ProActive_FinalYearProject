import { handlers } from "../../../../auth";

// Required for Auth.js compatibility with Next.js 15
export const runtime = "nodejs";

export const { GET, POST } = handlers;
