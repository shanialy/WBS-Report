import { BASE_URL } from "../../config/environment";

export const makeURL = (name: string) => {
  return `${BASE_URL}src/public/uploads/` + name;
};
