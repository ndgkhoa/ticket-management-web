import { useMutation } from '@tanstack/react-query';

import { suggestReplyApi } from '~/features/tickets/api/suggest-reply-api';

export const useSuggestReply = () => useMutation({ mutationFn: suggestReplyApi.draft });
