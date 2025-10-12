// src/report/reportController.ts

import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { ReportService } from './reportService';
import { ReportStatus, ReportEntityType, ReportType } from './reportEnums';

export class ReportController {
  constructor(private reportService: ReportService) {}

  createReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        reporterId,
        reportedEntityType,
        reportedEntityId,
        reportType,
        reason,
      } = req.body as {
        reporterId?: string;
        reportedEntityType?: string;
        reportedEntityId?: string;
        reportType?: string;
        reason?: string;
      };

      // Validate required fields
      if (!reporterId || !reportedEntityType || !reportedEntityId || !reportType) {
        res.status(400).json({
          message: '필수 필드가 누락되었습니다.',
          required: ['reporterId', 'reportedEntityType', 'reportedEntityId', 'reportType'],
        });
        return;
      }

      // Validate ObjectId format
      if (!ObjectId.isValid(reporterId) || !ObjectId.isValid(reportedEntityId)) {
        res.status(400).json({
          message: '유효하지 않은 ID 형식입니다.',
        });
        return;
      }

      // Validate enums
      if (!Object.values(ReportEntityType).includes(reportedEntityType)) {
        res.status(400).json({
          message: '유효하지 않은 엔티티 타입입니다.',
          validValues: Object.values(ReportEntityType),
        });
        return;
      }

      if (!Object.values(ReportType).includes(reportType)) {
        res.status(400).json({
          message: '유효하지 않은 신고 타입입니다.',
          validValues: Object.values(ReportType),
        });
        return;
      }

      const report = await this.reportService.createReport({
        reporterId: new ObjectId(reporterId),
        reportedEntityType: reportedEntityType as ReportEntityType,
        reportedEntityId: new ObjectId(reportedEntityId),
        reportType: reportType as ReportType,
        reason,
      });

      res.status(201).json({
        message: '신고가 성공적으로 접수되었습니다.',
        data: {
          ...report,
          _id: report._id?.toHexString(),
          reporterId: report.reporterId.toHexString(),
          reportedEntityId: report.reportedEntityId.toHexString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getReportById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          message: '유효하지 않은 ID 형식입니다.',
        });
        return;
      }

      const report = await this.reportService.getReportById(new ObjectId(id));

      if (!report) {
        res.status(404).json({
          message: '신고를 찾을 수 없습니다.',
        });
        return;
      }

      res.status(200).json({
        data: {
          ...report,
          _id: report._id?.toHexString(),
          reporterId: report.reporterId.toHexString(),
          reportedEntityId: report.reportedEntityId.toHexString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getReports = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { status, reportedEntityType, limit = '20', skip = '0' } = req.query;

      interface ReportFilter {
        status?: ReportStatus;
        reportedEntityType?: ReportEntityType;
      }

      const filter: ReportFilter = {};

      if (status) {
        if (!Object.values(ReportStatus).includes(status as ReportStatus)) {
          res.status(400).json({
            message: '유효하지 않은 상태 값입니다.',
            validValues: Object.values(ReportStatus),
          });
          return;
        }
        filter.status = status as ReportStatus;
      }

      if (reportedEntityType) {
        if (!Object.values(ReportEntityType).includes(reportedEntityType as ReportEntityType)) {
          res.status(400).json({
            message: '유효하지 않은 엔티티 타입입니다.',
            validValues: Object.values(ReportEntityType),
          });
          return;
        }
        filter.reportedEntityType = reportedEntityType as ReportEntityType;
      }

      const limitNum = parseInt(limit as string, 10);
      const skipNum = parseInt(skip as string, 10);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          message: 'limit은 1에서 100 사이의 숫자여야 합니다.',
        });
        return;
      }

      if (isNaN(skipNum) || skipNum < 0) {
        res.status(400).json({
          message: 'skip은 0 이상의 숫자여야 합니다.',
        });
        return;
      }

      const reports = await this.reportService.getReports(filter, {
        limit: limitNum,
        skip: skipNum,
        sort: { createdAt: -1 },
      });

      res.status(200).json({
        data: reports.map((report) => ({
          ...report,
          _id: report._id?.toHexString(),
          reporterId: report.reporterId.toHexString(),
          reportedEntityId: report.reportedEntityId.toHexString(),
        })),
        pagination: {
          limit: limitNum,
          skip: skipNum,
          count: reports.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateReportStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status?: string };

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          message: '유효하지 않은 ID 형식입니다.',
        });
        return;
      }

      if (!status || !Object.values(ReportStatus).includes(status)) {
        res.status(400).json({
          message: '유효하지 않은 상태 값입니다.',
          validValues: Object.values(ReportStatus),
        });
        return;
      }

      const updatedReport = await this.reportService.updateReportStatus(
        new ObjectId(id),
        status as ReportStatus,
      );

      if (!updatedReport) {
        res.status(404).json({
          message: '신고를 찾을 수 없습니다.',
        });
        return;
      }

      res.status(200).json({
        message: '신고 상태가 업데이트되었습니다.',
        data: {
          ...updatedReport,
          _id: updatedReport._id?.toHexString(),
          reporterId: updatedReport.reporterId.toHexString(),
          reportedEntityId: updatedReport.reportedEntityId.toHexString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          message: '유효하지 않은 ID 형식입니다.',
        });
        return;
      }

      const deleted = await this.reportService.deleteReport(new ObjectId(id));

      if (!deleted) {
        res.status(404).json({
          message: '신고를 찾을 수 없습니다.',
        });
        return;
      }

      res.status(200).json({
        message: '신고가 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };
}
