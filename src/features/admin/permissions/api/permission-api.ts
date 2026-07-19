import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  PERMISSION_COLUMNS,
  permissionSchema,
} from '~/features/admin/permissions/schemas/permission-schema';

/**
 * Data access for permissions. Read-only this stage — create/update/delete land with
 * the admin UI rebuild. Rows are validated into domain models here so nothing
 * downstream sees a snake_case column or an unvalidated shape.
 *
 * `.throwOnError()` is the SDK's own bridge from its `{ data, error }` return to the
 * throw React Query expects — and it rethrows the real `PostgrestError` (code, hint,
 * details intact), which a hand-rolled `new Error(error.message)` would flatten away.
 */
export const permissionApi = {
  list: async () => {
    const { data } = await supabase
      .from('permissions')
      .select(PERMISSION_COLUMNS)
      .order('code')
      .throwOnError();
    return z.array(permissionSchema).parse(data);
  },
};
