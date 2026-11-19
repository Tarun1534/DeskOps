import { Response, NextFunction } from 'express';
import { db } from '../../database/dataStore.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { ThumbnailWorker } from '../../workers/bullmq.worker.js';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const logs = db.auditEvents
      .filter((e) => e.organisationId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

export const getDeadLetterJobs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const jobs = Array.from(db.deadLetterJobs.values()).filter(
      (j) => j.organisationId === tenantId
    );
    return res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
};

export const replayDeadLetterJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = req.params.id as string;
    const replayed = await ThumbnailWorker.replayDeadLetterJob(id, tenantId);
    return res.json({ success: true, data: replayed });
  } catch (err) {
    next(err);
  }
};

export const getTechnicians = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const techs = Array.from(db.users.values())
      .filter((u) => u.organisationId === tenantId && u.role === 'TECHNICIAN')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        skills: ['HVAC', 'Electrical', 'Plumbing'],
      }));
    return res.json({ success: true, data: techs });
  } catch (err) {
    next(err);
  }
};

export const getProperties = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const properties = Array.from(db.properties.values()).filter(
      (p) => p.organisationId === tenantId
    );
    const units = Array.from(db.units.values()).filter(
      (u) => u.organisationId === tenantId
    );
    return res.json({
      success: true,
      data: properties.map((p) => ({
        ...p,
        units: units.filter((u) => u.propertyId === p.id),
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const users = Array.from(db.users.values())
      .filter((u) => u.organisationId === tenantId)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        unitId: u.unitId,
      }));
    return res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};
