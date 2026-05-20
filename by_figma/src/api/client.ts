const BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const AUTH_TOKEN_KEY = "icost_auth_token";

export function getAuthToken(): string | null {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export interface Transaction {
  id: number;
  category: string;
  merchant: string;
  amount: number;
  date: string;
  month: string;
  createdAt: string;
}

export interface ParsedReceiptDTO {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

export interface CreateTransactionDTO {
  category: string;
  merchant: string;
  amount: number;
  date: string;
  month: string;
}

export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

export interface Budget {
  month: string;
  monthlyBudget: number;
  categories: Record<string, number>;
}

export type UpdateBudgetDTO = Omit<Budget, "month">;

// ── Auth ──

export async function verifyToken(): Promise<boolean> {
  try {
    await request<{ valid: boolean }>("/auth/verify");
    return true;
  } catch {
    clearAuthToken();
    return false;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const res = await fetch(`${BASE}/auth/verify`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${password}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "密码错误" }));
    throw new Error(body.error || "密码错误");
  }

  const data = await res.json();
  return data.valid === true;
}

class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "UNKNOWN") {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (res.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error("未授权访问");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "请求失败" }));
    throw new ApiError(res.status, body.error || "请求失败");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Transactions ──

export async function fetchTransactions(month: string): Promise<Transaction[]> {
  const rows = await request<Transaction[]>(`/transactions?month=${encodeURIComponent(month)}`);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function createTransaction(
  dto: CreateTransactionDTO
): Promise<Transaction> {
  const row = await request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  return { ...row, amount: Number(row.amount) };
}

export async function updateTransaction(
  id: number,
  dto: UpdateTransactionDTO
): Promise<Transaction> {
  const row = await request<Transaction>(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
  return { ...row, amount: Number(row.amount) };
}

export async function deleteTransaction(id: number): Promise<void> {
  await request<void>(`/transactions/${id}`, { method: "DELETE" });
}

// ── Budget ──

export async function fetchBudget(month: string): Promise<Budget> {
  const row = await request<Budget>(`/budget?month=${encodeURIComponent(month)}`);
  return { ...row, monthlyBudget: Number(row.monthlyBudget) };
}

export async function updateBudget(
  month: string,
  dto: UpdateBudgetDTO
): Promise<Budget> {
  const row = await request<Budget>(`/budget?month=${encodeURIComponent(month)}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
  return { ...row, monthlyBudget: Number(row.monthlyBudget) };
}

// ── Receipt Parsing ──

export interface ParseReceiptResponse {
  transactions: ParsedReceiptDTO[];
  errors?: string[];
}

export async function parseReceipt(
  imageBase64: string
): Promise<ParseReceiptResponse> {
  const row = await request<{
    transactions: { merchant: string; amount: number | string; date: string; category: string }[];
    errors?: string[];
  }>("/transactions/parse-receipt", {
    method: "POST",
    body: JSON.stringify({ image: imageBase64 }),
  });
  return {
    transactions: row.transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    errors: row.errors,
  };
}

export async function parseReceipts(
  images: string[]
): Promise<ParseReceiptResponse> {
  const row = await request<{
    transactions: { merchant: string; amount: number | string; date: string; category: string }[];
    errors?: string[];
  }>("/transactions/parse-receipt", {
    method: "POST",
    body: JSON.stringify({ images }),
  });
  return {
    transactions: row.transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    errors: row.errors,
  };
}

// ── Categories ──

export async function fetchCategories(): Promise<string[]> {
  return request<string[]>("/categories");
}

export async function createCategory(name: string): Promise<void> {
  await request<{ name: string }>("/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
