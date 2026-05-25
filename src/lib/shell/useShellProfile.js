import { useMemo } from "react";

import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";
import useSession from "@/lib/hooks/useSession";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { buildShellProfileInput, resolveShellProfileExposure } from "@/lib/shell/shellProfileExposure";

export function useShellProfile() {
  const session = useSession();
  const appContext = useCurrentUserAppContext();
  const permissions = useEffectivePermissions();

  const exposure = useMemo(() => {
    const input = buildShellProfileInput({
      appContext: appContext.context,
      permissions,
      session,
      userId: session.userId,
    });

    return resolveShellProfileExposure(input);
  }, [appContext.context, permissions, session]);

  return useMemo(
    () =>
      Object.freeze({
        ...exposure,
        appContext: appContext.context,
        loading: Boolean(session.isLoading || appContext.loading || permissions.loading),
        error: appContext.error || permissions.error || null,
      }),
    [appContext.context, appContext.error, appContext.loading, exposure, permissions.error, permissions.loading, session.isLoading],
  );
}

export default useShellProfile;
