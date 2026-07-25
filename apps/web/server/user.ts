export const getUsers = async () => {
  const baseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5005";
  const response = await fetch(`${baseUrl}/user`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar usuários: ${response.status}`);
  }

  return response.json();
};
