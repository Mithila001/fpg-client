import client from "./client";
import type { JobStateResponse, JobStatus } from "../types";

export interface JobSubmissionResponse {
  job_id: string;
  status: JobStatus;
  message: string;
}

export const fetchJobState = async <T>(jobId: string): Promise<JobStateResponse<T>> => {
  const response = await client.get<JobStateResponse<T>>(`/algorithms/job/${jobId}`);
  return response.data;
};

export const cancelJob = async (jobId?: string): Promise<void> => {
  const payload = jobId ? { job_id: jobId } : {};
  await client.post("/algorithms/cancel", payload);
};
