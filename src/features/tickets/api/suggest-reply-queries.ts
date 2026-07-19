import { useMutation } from '@tanstack/react-query';

import { suggestReplyApi } from '~/features/tickets/api/suggest-reply-api';

/** On-demand reply draft from the suggestion panel — fires on click, not automatically. */
export const useSuggestReply = () => useMutation({ mutationFn: suggestReplyApi.draft });
