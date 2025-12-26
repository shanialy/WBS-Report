import { Response } from "express";
import { ZodError } from "zod";

class ResponseUtil {
  static successResponse(
    res: Response,
    statusCode: number,
    data = {},
    message: string = ""
  ) {
    res.status(statusCode).json({
      status: statusCode,
      data,
      success: true,
      message,
    });
  }

  static errorResponse(res: Response, statusCode: number, message: string) {
    res.status(statusCode).json({
      status: statusCode,
      success: false,
      data: {},
      message,
    });
  }

  static handleError(res: Response, err: any) {
    if (err instanceof ZodError) {
      const errorMessage: any = err.errors.map((er) => ({
        field: er.path.join("."),
        message: er.message,
      }));
      return ResponseUtil.errorResponse(res, 400, errorMessage);
    } else {
      return ResponseUtil.errorResponse(
        res,
        500,
        err.message || "Internal server error"
      );
    }
  }
}

export default ResponseUtil;
