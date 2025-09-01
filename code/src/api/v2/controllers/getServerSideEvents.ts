// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";

const clients: Map<string, Response> = new Map();
const roomClients: Map<string, Map<string, Response>> = new Map();

export const getServerSideEvents = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId: string = (req.query.roomId as string) || "default";
    const clientId: string = (req.query.clientId as string) || "default";

    // Set headers for SSE
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    // Save client stream
    clients.set(clientId, res);
    if (!roomClients.get(roomId)) {
      roomClients.set(roomId, new Map());
    }
    roomClients.get(roomId)?.set(clientId, res);

    res.write(":\n\n");

    // Optional: ping to keep connection alive
    const ping = setInterval(() => {
      res.write(":\n\n"); // comment to keep connection alive
    }, 15000);

    // Clean up on disconnect
    req.on("close", () => {
      clearInterval(ping);
      roomClients.get(roomId)?.delete(clientId);
      clients.delete(clientId);
      res.end();
    });
  };
};

export function notifyRoomClients<P>(roomId: string, payload: P) {
  const clients = roomClients.get(roomId);

  if (clients) {
    for (const client of clients.values()) {
      client.write(`event: weaveWorkloads\n`);
      client.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }
}

export function notifyClient<P>(clientId: string, payload: P) {
  const client = clients.get(clientId);

  if (client) {
    client.write(`event: weaveWorkloads\n`);
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
