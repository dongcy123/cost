import { useState } from "react";
import { verifyPassword, setAuthToken } from "../../api/client";

interface LoginScreenProps {
  onAuthenticated: () => void;
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("请输入密码");
      return;
    }

    setIsLoading(true);
    try {
      const valid = await verifyPassword(password.trim());
      if (valid) {
        setAuthToken(password.trim());
        onAuthenticated();
      }
    } catch (err: any) {
      setError(err.message || "验证失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-medium text-white">极简 AI 财务看板</h1>
          <p className="text-sm text-gray-400">请输入访问密码</p>
        </div>

        <input
          type="password"
          placeholder="访问密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoFocus
          autoComplete="current-password"
          className="w-full h-10 px-4 text-center text-base bg-transparent border border-white/20 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:border-white/50 disabled:opacity-50"
        />

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 bg-white text-black rounded-md font-medium hover:bg-white/90 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? "验证中..." : "进入"}
        </button>
      </form>
    </div>
  );
}
