import { z } from 'zod';

import { Constants } from '~/lib/database.types';

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
