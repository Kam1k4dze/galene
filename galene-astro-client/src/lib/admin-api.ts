export async function createToken(
  group: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: any,
  username?: string,
  password?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (username && password) {
    console.log(`[AdminAPI] Using credentials for user: ${username}`);
    headers["Authorization"] = "Basic " + btoa(username + ":" + password);
  } else {
    console.warn("[AdminAPI] No credentials provided for token creation");
  }

  console.log(`[AdminAPI] POST to /galene-api/v0/.groups/${group}/.tokens/`);

  const response = await fetch(`/galene-api/v0/.groups/${group}/.tokens/`, {
    method: "POST",
    headers,
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    throw new Error(`Failed to create token: ${response.statusText}`);
  }

  const location = response.headers.get("Location");
  if (!location) {
    throw new Error("Server didn't return location header");
  }
  return location;
}
