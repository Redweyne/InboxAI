import { apiRequest, queryClient } from "./queryClient";

interface AuthRetryOptions {
  onAuthSuccess: () => void;
  onAuthError?: (error: Error) => void;
  successMessage?: string;
}

/**
 * Handles OAuth authentication flow with automatic retry
 * Opens Google OAuth popup and automatically retries the original action after successful auth
 */
export async function handleAuthenticationRetry(
  options: AuthRetryOptions
): Promise<void> {
  try {
    const authResponse = await apiRequest("GET", "/api/auth/google/url");
    const authData = await authResponse.json();
    
    const authWindow = window.open(
      authData.url,
      "Google Auth",
      "width=600,height=600"
    );

    if (!authWindow) {
      throw new Error("Failed to open authentication window. Please check your popup blocker settings.");
    }

    const handleMessage = async (event: MessageEvent) => {
      // Security: Validate origin
      if (!event.origin.includes(window.location.origin)) {
        console.warn("[Auth] Ignoring message from unknown origin:", event.origin);
        return;
      }

      if (event.data.type === "gmail-auth-success") {
        window.removeEventListener("message", handleMessage);
        authWindow?.close();

        // Refresh auth status to update logout button visibility
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });

        // Wait a bit for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 300));

        // Call the success callback to retry the original action
        options.onAuthSuccess();
      }
    };

    window.addEventListener("message", handleMessage);

    // Clean up listener if window is closed manually
    const checkWindowClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkWindowClosed);
        window.removeEventListener("message", handleMessage);
      }
    }, 500);
  } catch (error: any) {
    if (options.onAuthError) {
      options.onAuthError(error);
    } else {
      throw error;
    }
  }
}
