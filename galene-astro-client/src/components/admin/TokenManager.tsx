import React, { useState } from "react";
import { galene } from "../../stores/galene";

export default function TokenManager() {
  const [permissions, setPermissions] = useState<string[]>(["present"]);
  const [username, setUsername] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiration, setExpiration] = useState<string>("24h");

  const availablePermissions = ["present", "op", "record"];

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedToken(null);
    setLoading(true);

    try {
      const groupName = galene.group;
      if (!groupName) {
        throw new Error("Not connected to a group");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const template: any = {
        permissions: permissions,
      };
      if (username.trim()) {
        template.username = username.trim();
      }

      let duration: number | undefined;
      if (expiration) {
        switch (expiration) {
          case "1h":
            duration = 60 * 60 * 1000;
            break;
          case "24h":
            duration = 24 * 60 * 60 * 1000;
            break;
          case "7d":
            duration = 7 * 24 * 60 * 60 * 1000;
            break;
          case "30d":
            duration = 30 * 24 * 60 * 60 * 1000;
            break;
          case "never":
            duration = 100 * 365 * 24 * 60 * 60 * 1000;
            break; // 100 years
        }
      }

      const token = await galene.createToken(
        username.trim() || undefined,
        duration
      );

      if (token) {
        const url = new URL(window.location.href);
        url.searchParams.set("token", token);
        url.searchParams.set("group", groupName);
        if (username.trim()) {
          url.searchParams.set("username", username.trim());
        } else {
          url.searchParams.delete("username");
        }
        setGeneratedToken(url.toString());
      } else {
        throw new Error("Could not extract token from response");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-200">
      <h3 className="text-lg font-semibold mb-4">Create Invite Token</h3>

      <form onSubmit={handleCreateToken} className="space-y-4">
        <div>
          <label
            htmlFor="token-username"
            className="block text-sm font-medium mb-1 text-zinc-400"
          >
            Username (Optional)
          </label>
          <input
            id="token-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="Force a specific username"
          />
        </div>

        <div>
          <span className="block text-sm font-medium mb-2 text-zinc-400">
            Permissions
          </span>
          <div className="flex flex-wrap gap-2">
            {availablePermissions.map((perm) => (
              <button
                key={perm}
                type="button"
                onClick={() => togglePermission(perm)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  permissions.includes(perm)
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {perm}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="token-expiration"
            className="block text-sm font-medium mb-2 text-zinc-400"
          >
            Expiration
          </label>
          <select
            id="token-expiration"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-zinc-200"
          >
            <option value="1h">1 Hour</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="never">Never</option>
          </select>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 p-2 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Generate Link"}
        </button>
      </form>

      {generatedToken && (
        <div className="mt-4 p-3 bg-zinc-800 rounded border border-zinc-700">
          <p className="text-xs text-zinc-400 mb-1">Invite Link:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={generatedToken}
              className="flex-1 bg-transparent text-sm text-zinc-200 focus:outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => navigator.clipboard.writeText(generatedToken)}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
