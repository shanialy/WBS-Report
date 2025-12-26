export const generateRandomPassword = (length = 8): string => {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$";

  // Ensure at least one of each type
  const getRandom = (chars: string) =>
    chars[Math.floor(Math.random() * chars.length)];

  let password = "";
  password += getRandom(upper);
  password += getRandom(lower);
  password += getRandom(numbers);
  password += getRandom(special);

  const allChars = upper + lower + numbers + special;
  for (let i = 4; i < length; i++) {
    password += getRandom(allChars);
  }

  // Shuffle password to avoid predictable pattern
  password = password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
  return password;
};
