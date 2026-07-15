import { Queue } from "bullmq";
import { connection } from "./connection";

export const atsQueue = new Queue("ats-analysis-queue", {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // keep for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600, // keep failed for 24 hours
    },
  },
});

atsQueue.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') return; 
  console.error('Queue error:', err.message);
});

export const addAtsJob = async (jobId: string, data: any) => {
  await atsQueue.add("analyze-resume", data, { jobId });
};

export const getAtsJob = async (jobId: string) => {
  return await atsQueue.getJob(jobId);
};
