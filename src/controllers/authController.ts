import { Request, Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AUTH_CONSTANTS } from "../constants/messages";
import { compare, compareSync } from "bcrypt";
import { generateToken } from "../utils/Token";
import { CustomRequest } from "../interfaces/auth";
import { hash } from "bcrypt";
import AuthConfig from "../config/authConfig";
import { sendEmail } from "../utils/SendEmail";
import { emailTemplateGeneric } from "../utils/SendEmail/template";
import { randomInt } from "crypto";
import {
  changePasswordSchema,
  createProfileSchema,
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  resetPasswordSchema,
  signupSchema,
} from "../validators/authValidators";
import UserModel from "../models/UserModel";
import { OtpModel } from "../models/OtpModel";

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);
    const userExist = await UserModel.findOne({
      email: email,
    });
    if (userExist) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.USER_ALREADY_EXISTS
      );
    }
    const hashPassword = await hash(password, String(AuthConfig.SALT));

    const user = await UserModel.create({
      email: email,
      password: hashPassword,
      name: name,
    });

    const otp = randomInt(100000, 999999);
    await OtpModel.create({
      userId: user._id,
      otp: String(otp),
    });

    const template = emailTemplateGeneric(otp);

    await sendEmail(email, AUTH_CONSTANTS.VERIFICATION_CODE, template);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user },
      AUTH_CONSTANTS.OTP_SENT
    );
  } catch (error: any) {
    return ResponseUtil.handleError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    let user: any = await UserModel.findOne({ email });

    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }

    const hashpass = compareSync(password, String(user.password));

    if (!hashpass) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.PASSWORD_MISMATCH
      );
    }
    const token = generateToken({
      email: email,
      id: String(user._id),
    });

    user = user.toObject();
    delete user.password;

    if (!user.isVerified) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { user },
        AUTH_CONSTANTS.NOT_VERIFIED
      );
    }

    if (!user.isProfileCompleted) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { token, user },
        AUTH_CONSTANTS.INCOMPLETE_PROFILE
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user, token },
      AUTH_CONSTANTS.LOGGED_IN
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp, email } = otpVerifySchema.parse(req.body);
    const findUser = await UserModel.findOne({ email: email });
    const otpRes = await OtpModel.findOne({ userId: findUser?._id });

    if (!otpRes) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.INVALID_OTP
      );
    }

    if (otpRes && otpRes.otp != otp) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.INVALID_OTP
      );
    }

    if (otpRes && new Date() > otpRes.expiry) {
      await OtpModel.findByIdAndDelete(otpRes._id);
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.OTP_EXPIRED
      );
    }

    const user = await UserModel.findByIdAndUpdate(findUser?._id, {
      isVerified: true,
    });

    if (user && user.email) {
      await OtpModel.findByIdAndDelete(otpRes._id);
      const token = generateToken({
        email: user.email,
        id: String(findUser?._id),
      });

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { token },
        AUTH_CONSTANTS.OTP_VERIFIED
      );
    }
    return ResponseUtil.errorResponse(
      res,
      STATUS_CODES.NOT_FOUND,
      AUTH_CONSTANTS.USER_NOT_FOUND
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = otpSendSchema.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }
    const otp = randomInt(100000, 999999);
    const model = await OtpModel.findOneAndUpdate(
      { userId: user._id },
      { otp: String(otp), expiry: new Date(Date.now() + 10 * 60 * 1000) }
    );
    if (!model) {
      OtpModel.create({
        userId: user._id,
        otp: String(otp),
      });
    }
    const template = emailTemplateGeneric(otp);
    await sendEmail(email, AUTH_CONSTANTS.VERIFICATION_CODE, template);
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      AUTH_CONSTANTS.OTP_SENT
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getProfile = async (req: CustomRequest, res: Response) => {
  try {
    let user: any = await UserModel.findById(req.userId);

    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }

    user = user.toObject();
    delete user.password;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user },
      AUTH_CONSTANTS.USER_FETCHED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const changePassword = async (req: CustomRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }
    const matchedpassword = await compare(oldPassword, user.password as string);
    if (!matchedpassword) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.OLD_PASSWORD_NOT_MATCHED
      );
    }
    const password = await hash(newPassword, AuthConfig.SALT as string);

    await UserModel.findByIdAndUpdate(req.userId, {
      password: password,
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      AUTH_CONSTANTS.PASSWORD_CHANGED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const resetPassword = async (req: CustomRequest, res: Response) => {
  try {
    const { password } = resetPasswordSchema.parse(req.body);

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }

    const newPassword = await hash(password, AuthConfig.SALT as string);

    await UserModel.findByIdAndUpdate(req.userId, {
      password: newPassword,
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      AUTH_CONSTANTS.PASSWORD_RESET
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const logout = async (req: CustomRequest, res: Response) => {
  try {
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      AUTH_CONSTANTS.LOGGED_OUT
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const deleteAccount = async (req: CustomRequest, res: Response) => {
  try {
    await UserModel.deleteOne({
      _id: req.userId,
    });
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      "Deleted successfully"
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const createProfile = async (req: any, res: Response) => {
  try {
    const { businessName, companySize, about } = createProfileSchema.parse(
      req.body
    );

    let profilePicture = "";

    if (
      req.filesInfo &&
      req.filesInfo.profilePicture &&
      req.filesInfo.profilePicture.length
    ) {
      profilePicture = req.filesInfo.profilePicture[0].url;
    }

    let user: any;

    user = await UserModel.findByIdAndUpdate(
      req.userId,
      {
        businessName,
        companySize,
        about,
        isProfileCompleted: true,
        profilePicture,
      },
      { new: true }
    );

    const token = generateToken({
      email: String(user.email),
      id: String(req.userId),
    });

    user = user.toObject();
    delete user.password;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user, token },
      AUTH_CONSTANTS.PROFILE_CREATED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    let profilePicture = undefined;

    if (
      req.filesInfo &&
      req.filesInfo.profilePicture &&
      req.filesInfo.profilePicture.length
    ) {
      profilePicture = req.filesInfo.profilePicture[0].url;
    }

    if (profilePicture) {
      req["body"]["profilePicture"] = profilePicture;
    }

    let user: any = await UserModel.findByIdAndUpdate(
      req.userId,
      {
        ...req.body,
      },
      { new: true }
    );

    user = user.toObject();
    delete user.password;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user },
      AUTH_CONSTANTS.PROFILE_UPDATED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
