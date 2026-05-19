import { EventEmitter } from 'events';

// Prevent creating multiple event emitters during development hot-reloading
const globalForEvents = global as unknown as { eventEmitter?: EventEmitter };

export const eventEmitter = globalForEvents.eventEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.eventEmitter = eventEmitter;
}
