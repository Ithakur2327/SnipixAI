import { Response } from "express";

export const ok = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

export const paginated = (
  res: Response,
  data: unknown,
  total: number,
  page: number,
  limit: number
) => {
  res.status(200).json({
    success: true,
    data,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

export const fail = (res: Response, message: string, status = 400) => {
  res.status(status).json({ success: false, error: { message, statusCode: status } });
};