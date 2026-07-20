import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  PERMISSION_COLUMNS,
  permissionSchema,
} from '~/features/admin/permissions/schemas/permission-schema';

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
