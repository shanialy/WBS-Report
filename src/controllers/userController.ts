import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AUTH_CONSTANTS } from "../constants/messages";
import axios from "axios";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { s3 } from "../config/s3Config";
import { Upload } from "@aws-sdk/lib-storage";
import WBSModel from "../models/WBSModel";
import { CustomRequest } from "../interfaces/auth";

export const generateWBS = async (req: CustomRequest, res: Response) => {
  try {
    const OPENROUTER_API_KEY =
      "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";
    const MODEL = "openai/gpt-4o";
    const { projectName, scope } = req.body;
    const prompt = buildPrompt({ projectName, scope });

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const raw = response.data.choices[0].message.content;
    const json = JSON.parse(raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)[1]);

    const pdfPath = await generateAndUploadPDFToS3(json);

    await WBSModel.create({
      title: projectName,
      description: scope,
      media: pdfPath.s3Url,
      user: req.userId,
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { filePath: pdfPath },
      AUTH_CONSTANTS.CREATED
    );
  } catch (error: any) {
    return ResponseUtil.handleError(res, error);
  }
};

export const listWBS = async (req: CustomRequest, res: Response) => {
  try {
    const wbsList = await WBSModel.find({ user: req.userId });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { wbsList },
      AUTH_CONSTANTS.FETCHED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
export const detailWBS = async (req: CustomRequest, res: Response) => {
  try {
    const data = await WBSModel.findById(req.params.id);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { data },
      AUTH_CONSTANTS.FETCHED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

const buildPrompt = ({ projectName, scope }: any) => `
You are a senior project planning consultant.

Based on the following information, create a realistic project timeline and risk assessment.

Project Name: ${projectName}
Project Scope: ${scope}

Assumptions:
- Medium complexity software project
- Agile development
- Standard working days (Mon–Fri)
- Typical team size (3–4 developers)
- Reasonable modern tech stack

Tasks:
1. Estimate total calendar days and working days
2. Split working days into phases:
   - Design: 15%
   - Development: 60%
   - QA: 15%
   - Deployment: 10%
3. Provide risk assessment levels (Low / Medium / High) with short reasons

Return ONLY valid JSON in this structure:

{
  "projectName": "${projectName}",
  "assumptions": {
    "teamSize": 3,
    "durationMonths": 4
  },
  "totalCalendarDays": 120,
  "totalWorkingDays": 85,
  "projectPhases": {
    "design": 13,
    "development": 51,
    "qa": 13,
    "deployment": 8
  },

}
`;

// "riskAssessment": {
//   "time": { "level": "Medium", "reason": "Tight delivery window for feature-rich scope." },
//   "resource": { "level": "Medium", "reason": "Small team handling full-stack workload." },
//   "requirement": { "level": "High", "reason": "Scope may evolve during development." },
//   "technical": { "level": "Low", "reason": "Modern, stable technologies assumed." }
// }

async function generateAndUploadPDFToS3(data: any) {
  const doc = new PDFDocument({ margin: 50 });
  const stream = new PassThrough();

  const fileKey = `projects/${data.projectName
    .replace(/\s+/g, "-")
    .toLowerCase()}-${Date.now()}.pdf`;

  // Start S3 upload
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: stream,
      ContentType: "application/pdf",
    },
  });

  // Pipe PDF → S3
  doc.pipe(stream);

  /* ===== PDF CONTENT ===== */

  doc.fontSize(22).text(data.projectName, { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text("Project Overview", { underline: true });
  doc.moveDown(0.5);

  doc
    .fontSize(11)
    .text(`Estimated Duration: ${data.assumptions.durationMonths} months`)
    .text(`Team Size: ${data.assumptions.teamSize}`)
    .moveDown();

  doc.fontSize(14).text("Timeline Breakdown", { underline: true });
  doc.moveDown(0.5);

  doc.text(`Total Calendar Days: ${data.totalCalendarDays}`);
  doc.text(`Total Working Days: ${data.totalWorkingDays}`);
  doc.moveDown();

  Object.entries(data.projectPhases).forEach(([phase, days]) => {
    doc.text(`${phase.toUpperCase()}: ${days} working days`);
  });

  doc.moveDown();
  // doc.fontSize(14).text("Risk Assessment", { underline: true });
  // doc.moveDown(0.5);

  // Object.entries(data.riskAssessment).forEach(([key, val]) => {
  //   doc
  //     .fontSize(11)
  //     .text(`${key.toUpperCase()} RISK: ${val.level}`)
  //     .fontSize(10)
  //     .text(`Reason: ${val.reason}`)
  //     .moveDown(0.5);
  // });

  doc.end();

  // Wait until upload completes
  await upload.done();

  return {
    s3Key: fileKey,
    s3Url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
  };
}
