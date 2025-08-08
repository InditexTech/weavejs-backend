import { Request, Response } from "express";

const clients: Map<string, Response> = new Map();

export const getServerSideEvents = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const clientId: string = (req.query.clientId as string) || "default";

    // Set headers for SSE
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    console.log("NEW CLIENT SSE:", clientId);

    // Save client stream
    clients.set(clientId, res);
    res.write(":\n\n");

    // Optional: ping to keep connection alive
    const ping = setInterval(() => {
      res.write(":\n\n"); // comment to keep connection alive
    }, 15000);

    // Clean up on disconnect
    req.on("close", () => {
      clearInterval(ping);
      clients.delete(clientId);
      res.end();
    });
  };
};

export function notifyClient<P>(clientId: string, payload: P) {
  const client = clients.get(clientId);

  if (client) {
    console.log("NOTIFY CLIENT SSE:", clientId, payload);
    client.write(`event: weaveWorkloads\n`);
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
