
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  category: string;
  steps: string[];
}

export interface WebResource {
  title: string;
  uri: string;
}

export interface WorkspaceSummary {
  detectedApps: string[];
  intent: string;
  resources: WebResource[];
}

export enum AnalysisStep {
  IDLE = 'IDLE',
  CAPTURING = 'CAPTURING',
  ANALYZING = 'ANALYZING',
  READY = 'READY'
}
