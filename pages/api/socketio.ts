import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { Server as IOServer } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

type SocketServerWithIO = HTTPServer & { io?: IOServer };
type NextSocket = NetSocket & { server: SocketServerWithIO };
type NextApiResponseWithSocket = NextApiResponse & { socket: NextSocket };

type SocketServerWithStats = SocketServerWithIO & {
  statsInterval?: NodeJS.Timeout;
  statsInFlight?: Promise<void> | null;
};

type AdminStatsPayload = {
  studentGrowth: unknown;
  achievementsGained: unknown;
  aiInsight: unknown;
  generatedAt: string;
};

async function loadAdminStats(): Promise<AdminStatsPayload> {
  const [growthRes, achievementsRes, insightRes] = await Promise.all([
    import('@/app/api/admin/student-growth/route').then((m) => m.GET()),
    import('@/app/api/admin/achievements-gained/route').then((m) => m.GET()),
    import('@/app/api/admin/ai-insight/route').then((m) => m.GET()),
  ]);

  const [studentGrowth, achievementsGained, aiInsight] = await Promise.all([
    growthRes.json(),
    achievementsRes.json(),
    insightRes.json(),
  ]);

  return {
    studentGrowth,
    achievementsGained,
    aiInsight,
    generatedAt: new Date().toISOString(),
  };
}

async function emitAdminStats(io: IOServer, server: SocketServerWithStats): Promise<void> {
  if (server.statsInFlight) {
    return server.statsInFlight;
  }

  server.statsInFlight = (async () => {
    try {
      const payload = await loadAdminStats();
      io.emit('admin:stats', payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load admin stats';
      io.emit('admin:stats:error', { message, generatedAt: new Date().toISOString() });
    } finally {
      server.statsInFlight = null;
    }
  })();

  return server.statsInFlight;
}

export default function handler(_req: NextApiRequest, res: NextApiResponseWithSocket) {
  const server = res.socket.server as SocketServerWithStats;

  if (!server.io) {
    const io = new IOServer(server, {
      path: '/api/socketio',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      socket.emit('server:hello', { connectedAt: new Date().toISOString() });

      // Push the latest stats immediately upon connect.
      emitAdminStats(io, server).catch(() => {
        // Errors are already emitted via admin:stats:error.
      });

      socket.on('client:ping', () => {
        socket.emit('server:pong', { at: new Date().toISOString() });
      });
    });

    // Broadcast stats on an interval to keep dashboards up-to-date.
    // Without DB triggers, this is the simplest way to provide "live" updates.
    server.statsInterval = setInterval(() => {
      emitAdminStats(io, server).catch(() => {
        // Errors are already emitted via admin:stats:error.
      });
    }, 15_000);

    server.io = io;
  }

  res.status(200).end();
}
