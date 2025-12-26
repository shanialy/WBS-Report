import { Request, Response, NextFunction } from "express";
import AuthConfig from "../config/authConfig";

export const checkBearer = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bearerToken = AuthConfig.BEARER_TOKEN;
  const tokenHeader = req.headers["auth_token"] as string | undefined;

  if (tokenHeader === bearerToken) {
    next();
  } else {
    res.status(410).json({ message: "UnAuthorized Request" });
  }
};
