export const getUsers = async (token?: string) => {
  const baseUrl =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5005";
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}/user`, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar usuários: ${response.status}`);
  }

  return response.json();
};
