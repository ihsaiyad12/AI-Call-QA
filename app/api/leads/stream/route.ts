import { eventEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const customStream = new ReadableStream({
    start(controller) {
      // Send a heartbeat ping every 15 seconds to prevent client timeout
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (err) {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      const onNewLead = (lead: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(lead)}\n\n`));
        } catch (err) {
          eventEmitter.off('new-lead', onNewLead);
          clearInterval(heartbeatInterval);
        }
      };

      const onLeadUpdate = (lead: any) => {
        try {
          controller.enqueue(encoder.encode(`event: update-lead\ndata: ${JSON.stringify(lead)}\n\n`));
        } catch (err) {
          eventEmitter.off('update-lead', onLeadUpdate);
          clearInterval(heartbeatInterval);
        }
      };

      eventEmitter.on('new-lead', onNewLead);
      eventEmitter.on('update-lead', onLeadUpdate);

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        eventEmitter.off('new-lead', onNewLead);
        eventEmitter.off('update-lead', onLeadUpdate);
        clearInterval(heartbeatInterval);
      });
    },
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
