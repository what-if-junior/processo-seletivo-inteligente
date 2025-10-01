export const getUsers = async () => {
  const response = await fetch(`http://localhost:5005/user`); // depois isso vai virar um process.env pelo amor de deus
  return response.json();
}