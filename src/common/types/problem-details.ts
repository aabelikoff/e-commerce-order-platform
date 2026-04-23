export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;

  code?: string;
  errors?: string | string[];
  timestamp?: string;
  requestId?: string;
};
