import { Response, NextFunction } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { CustomRequest } from "../interfaces/auth";

const role = (...allowedRoles: string[]) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const userRole = req.role; // coming from checkAuth

    if (!userRole || !allowedRoles.includes(userRole)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "You do not have permission to access this resource"
      );
    }

    next();
  };
};

export default role;
