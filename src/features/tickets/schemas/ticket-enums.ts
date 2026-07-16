import { z } from 'zod';

import { Constants } from '~/lib/database.types';

/**
 * Domain enums, derived from the generated DB constants rather than retyped.
 *
 * `Constants.public.Enums` is the runtime array `supabase gen types` emits alongside
 * the type. Building the Zod enums from it means a value added to a Postgres enum
 * appears here the moment `bun run db:types` runs — a hand-written `z.enum([...])`
 * would silently accept the old set and reject the new value at runtime instead.
 */

export const ticketStatusSchema = z.enum(Constants.public.Enums.ticket_status);
export const ticketPrioritySchema = z.enum(Constants.public.Enums.ticket_priority);
export const ticketChannelSchema = z.enum(Constants.public.Enums.ticket_channel);
export const messageTypeSchema = z.enum(Constants.public.Enums.message_type);
export const ticketEventTypeSchema = z.enum(Constants.public.Enums.ticket_event_type);

export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type TicketChannel = z.infer<typeof ticketChannelSchema>;
export type MessageType = z.infer<typeof messageTypeSchema>;
export type TicketEventType = z.infer<typeof ticketEventTypeSchema>;
