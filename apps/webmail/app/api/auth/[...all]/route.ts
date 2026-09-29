import { getConvexAuth } from "../../../../lib/convex-auth";

export async function GET(request: Request): Promise<Response> {
  return getConvexAuth().handler.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return getConvexAuth().handler.POST(request);
}
